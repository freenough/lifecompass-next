'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulatorStore } from '@/store/simulatorStore';
import type { ScenarioKey } from '@/store/simulatorStore';
import { decodeProfileUrl } from '@/lib/storage';
import { profileToSimParams, getUnconfiguredAccounts, getRetirementAgeWarnings, getCryptoManualWarnings } from '@/lib/profile';
import { BASE_PATH } from '@/lib/siteConfig';
import type { WithdrawalStrategy } from '@/lib/types';
import { useInView } from '@/hooks/useInView';
import KpiGrid             from '@/components/simulator/KpiGrid';
import StickyKpiBar        from '@/components/simulator/StickyKpiBar';
import AssetChart, { STRATEGY_LABELS } from '@/components/simulator/AssetChart';
import YearlyTable         from '@/components/simulator/YearlyTable';
import CashFlowChart       from '@/components/simulator/CashFlowChart';
import SimulatorForm       from '@/components/simulator/SimulatorForm';
import MonteCarloPanel     from '@/components/simulator/MonteCarloPanel';
import SensitivityPanel    from '@/components/simulator/SensitivityPanel';
import ImpactTable         from '@/components/simulator/ImpactTable';
import AiPanel             from '@/components/simulator/AiPanel';
import ProfileDrawer       from '@/components/simulator/ProfileDrawer';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import { simulateCorporateAssets } from '@/lib/hojinCompanyState/corporateGrowth';
import { useDisplayMcResult } from '@/lib/hojinCompanyState/useDisplayMcResult';
import { runMonteCarloWithCorporateAwareness } from '@/components/hojinCompanyState/CorporateSettingsSection';

const STRATEGY_OPTIONS: { key: WithdrawalStrategy; label: string }[] = [
  { key: 'proportional',  label: '比例取崩' },
  { key: 'cash_first',    label: '現金優先' },
  { key: 'taxable_first', label: '課税優先' },
];

const SCENARIO_OPTIONS: { key: ScenarioKey; label: string; color: string }[] = [
  { key: 'optimistic',  label: '楽観(+2%)', color: 'text-green-700' },
  { key: 'neutral',     label: '中立',       color: 'text-slate-700' },
  { key: 'pessimistic', label: '悲観(-2%)',  color: 'text-red-600'  },
];

/** useSearchParams を Suspense 境界内で使うための分離コンポーネント */
function SearchParamsLoader() {
  const searchParams = useSearchParams();
  const { loadProfile } = useSimulatorStore();
  useEffect(() => {
    const s = searchParams.get('s');
    if (s) {
      try {
        loadProfile(decodeProfileUrl(s));
        window.history.replaceState(null, '', `${BASE_PATH}/app`);
      } catch {
        // ignore malformed URL param
      }
    }
  }, []);
  return null;
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const {
    profile, snaps, analysis, mcResult, mcError, mode, cmpMode, activeStrategies, displayStrategy, activeScenarios,
    isMcRunning, setMode, setCmpMode, setActiveStrategies, setDisplayStrategy, setActiveScenarios,
    updateProfile,
  } = useSimulatorStore();

  const [formOpen, setFormOpen] = useState(true);
  const [kpiRef, kpiInView] = useInView<HTMLDivElement>();
  const [formRef, formInView] = useInView<HTMLDivElement>();
  const tabAnchorRef = useRef<HTMLDivElement>(null);
  const formTopAnchorRef = useRef<HTMLDivElement>(null);
  const wasFormOpenRef = useRef(formOpen);

  // Default collapse on mobile
  useEffect(() => {
    if (window.innerWidth <= 640) setFormOpen(false);
  }, []);

  // 「閉じる」で閉じた直後は固定モード/MCモードタブの直上へ、「開く」で開いた直後は入力
  // パラメータセクションの先頭へ、それぞれ明示的にscrollIntoViewする。
  // フォームの開閉が実際に機能するのはlg:未満（1024px未満、formRefのlg:flex参照）のみ
  // （lg:以上は左右並びレイアウトのため常時表示）。この境界を1024pxに揃えることで、
  // 「トグンは見えるのに押しても表示もスクロールも何も起きない」帯域を作らない。
  useEffect(() => {
    if (window.innerWidth >= 1024) { wasFormOpenRef.current = formOpen; return; }
    if (wasFormOpenRef.current && !formOpen) {
      tabAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (!wasFormOpenRef.current && formOpen) {
      formTopAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    wasFormOpenRef.current = formOpen;
  }, [formOpen]);

  const strategy     = displayStrategy;
  const baseSnaps    = snaps[strategy] ?? [];
  const baseAnalysis = analysis[strategy];
  const p            = profileToSimParams(profile);
  const unconfiguredAccounts = getUnconfiguredAccounts(profile);
  const retirementAgeWarnings = getRetirementAgeWarnings(profile);
  const cryptoManualWarnings = getCryptoManualWarnings(profile);
  // 最終資産KPIの黄/緑判定用：最終年（インフレ調整後・名目）の年間支出
  const lastExpense  = baseSnaps.length > 0 ? baseSnaps[baseSnaps.length - 1].expense : 0;
  // 退職時充足率（詳細アコーディオン用）：退職時点のスナップショットで資産÷(支出×25)を計算
  const retSnap = baseSnaps.find(s => s.age === p.retAge);
  const fireAchievementRate = retSnap && retSnap.expense > 0
    ? Math.round((retSnap.totalAssets / (retSnap.expense * 25)) * 100)
    : null;

  // ── 法人資産オーバーレイ（最終版指示書3.8節）──────────────────────
  // includeInPersonalSimulatorトグルOFF時はcorporate*系propsを一切渡さない
  // （既存表示は完全に従来通り）。個人側snaps/analysis自体は、トグルON時にすでに
  // extraEvents経由で法人取崩を反映済み（CorporateSettingsSection.tsx参照）ため、
  // ここで追加計算するのは「法人自身の残高」の重ね合わせ表示分のみ。
  const companyState = useCompanyStateStore(s => s.state);
  const combinedMcResult = useCompanyStateStore(s => s.combinedMcResult);
  const includeInPersonalSimulator = companyState.settings.includeInPersonalSimulator;

  const corporateSnaps = includeInPersonalSimulator
    ? simulateCorporateAssets(companyState.settings, p.curAge, p.lifeEx, companyState.portfolio, companyState.events, null)
    : null;
  const corporateBalance = corporateSnaps
    ? baseSnaps.filter(s => s.age >= p.curAge).map(s => corporateSnaps.find(c => c.age === s.age)?.total ?? 0)
    : null;
  const corporateBalanceByAge = corporateSnaps
    ? Object.fromEntries(corporateSnaps.map(c => [c.age, c.total]))
    : null;
  const corporateFinalTotal = corporateSnaps ? corporateSnaps[corporateSnaps.length - 1]?.total ?? 0 : null;
  const combinedFinalTotal = includeInPersonalSimulator ? baseAnalysis.last + (corporateFinalTotal ?? 0) : null;

  // mc.tsの合算MCは3戦略（比例取崩／現金優先／課税優先）それぞれ独立に計算する
  // （2026-08-21修正：1戦略分を複製する簡略化は、戦略間の差が実際には消えていないのに
  // 消えて見える誤表示になっていたため廃止）。変換ロジックはuseDisplayMcResultに一本化した
  // （2026-08-22修正：MonteCarloPanel/ImpactTable/AiPanelもこのフックを使う）。
  const displayMcResult = useDisplayMcResult(mcResult);
  const corporateMcCombined = includeInPersonalSimulator && combinedMcResult
    ? combinedMcResult.combined[displayStrategy].percentiles
    : null;
  // UI仕上げ指示書3章：KpiGridの「MC破綻確率」カードにも法人合算バッジを追加する
  // （「最終資産」カード・モンテカルロ分析欄には既にあったが、このカードだけ実装漏れだった）。
  const corporateCombinedBankruptcyRate = includeInPersonalSimulator && combinedMcResult
    ? combinedMcResult.combined[displayStrategy].bankruptcyRate
    : null;

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-400 text-sm">読み込み中...</p>
    </div>
  );

  if (!baseAnalysis) return null;

  const toggleStrategy = (key: WithdrawalStrategy) => {
    const next = activeStrategies.includes(key)
      ? activeStrategies.filter(s => s !== key)
      : [...activeStrategies, key];
    if (next.length > 0) setActiveStrategies(next);
  };

  const toggleScenario = (key: ScenarioKey) => {
    const next = activeScenarios.includes(key)
      ? activeScenarios.filter(s => s !== key)
      : [...activeScenarios, key];
    if (next.length > 0) setActiveScenarios(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 pb-6">
      <Suspense fallback={null}>
        <SearchParamsLoader />
      </Suspense>
      {/* PC幅（lg:以上、横並びレイアウト）のみ、通常配置のまま表示 */}
      <div className="hidden lg:flex justify-end mb-2">
        <ProfileDrawer />
      </div>

      {/* gap-2 lg:gap-6: 1024px未満は縦積みレイアウトの縦方向の隙間として使われるためgap-2(8px)
          に詰める。1024px以上は左右パネル（入力パラメータ⇄KPI側）の横方向の間隔としても
          共有されている値のため、そちらはgap-6(24px)のまま変更しない。 */}
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左: 入力パネル — DOM first so mobile toggle reveals at top, not below results */}
        <div className="lg:w-80 lg:shrink-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          {/* 「入力を編集」クリック時の自動スクロール先（入力パラメータセクションの先頭）。
              tabAnchorRefと同じ理由でscroll-mt-*が必要（ヘッダー+固定行の重なり分）。
              このdiv自体は高さ・余白を一切持たない（scroll-mt-*はスクロール位置計算にのみ影響し、
              レイアウト上の高さ・余白には影響しない）。 */}
          <div ref={formTopAnchorRef} className="scroll-mt-32" />
          {/* 「保存/読み込み」と「入力を編集/閉じる」を横並び1行で常時固定表示（lg:未満のみ）。
              position: sticky だと祖先（この左パネルdiv）の高さを超えてスクロールした時点で
              一緒に画面外へ消えてしまう（sticky は最も近い有意な祖先の範囲内でしか効かないため）
              position: fixed で画面自体に固定する。直下にスペーサーを置き、
              fixed化で抜けた分のレイアウト高さを補って本文が隠れないようにする
              （スペーサーの高さは実測値に合わせて調整）。 */}
          <div className="lg:hidden h-[33px]" aria-hidden="true" />
          <div className="lg:hidden fixed top-14 left-4 right-4 z-30 flex items-center gap-2">
            <button
              className="flex-1 rounded-lg border border-slate-300 bg-white py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={() => setFormOpen(o => !o)}
            >
              {formOpen ? '入力を閉じる ▲' : '入力を編集 ▼'}
            </button>
            <ProfileDrawer triggerClassName="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50" />
          </div>
          {/* トグンボタンの表示範囲（lg:hidden＝1024px未満）と、フォームの開閉が実際に
              機能する範囲を一致させる。以前は`hidden sm:flex`（640px以上で強制表示）
              だったため、640〜1024pxでボタンは見えるのに押しても何も起きない不整合が
              あった。lg:flexで1024px以上のみ常時表示にし、それ未満はformOpenに厳密に従う
              （新しいブレークポイントの導入ではなく、既存のlg:flex-row切り替えと同じ
              閾値に統一している）。 */}
          <div ref={formRef} className={`flex-col gap-4 lg:flex ${formOpen ? 'flex' : 'hidden'}`}>
            <SimulatorForm />
          </div>
        </div>

        {/* 右: 結果パネル */}
        {/* lg:-mr-4 でページ全体のpx-4を打ち消し、右パネルの内側スクロールバーをページ全体のスクロールバーに隣接させる。
            lg:pr-4 で打ち消した分と同じ幅を内側パディングとして再確保するため、コンテンツの横幅・位置は変わらない
            （左側にはpl-4を付けない: 左パネルとの間のgap-6が既に十分な余白のため、コンテンツ幅を削ってまで追加しない）。 */}
        <div className="flex flex-1 flex-col gap-4 min-w-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">

          {unconfiguredAccounts.length > 0 && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              {unconfiguredAccounts.join('、')}の資産配分が未設定です（利回り0%として計算されています）。ポートフォリオに1行追加するか、利回り設定で直接利回りを入力してください。
            </p>
          )}

          {retirementAgeWarnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 space-y-1">
              {retirementAgeWarnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          {cryptoManualWarnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 space-y-1">
              {cryptoManualWarnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          {/* 「入力を閉じる」クリック時の自動スクロール先（固定モード/MCモードタブの直上）。
              scroll-margin-topを付けないと、scrollIntoViewはこのdivの上端をビューポートのy=0に
              合わせようとするが、そこはグローバルヘッダー(sticky top-0, 高さ約56px)と、
              このページ自身のfixed行（「保存/読み込み」+「入力を編集/閉じる」、top-14〜）が
              重なって覆っている領域のため、実際にはタブより下まで進んだように見えてしまう。
              scroll-margin-topでその分の余白を確保する（formTopAnchorRefと同じ値。実測値は
              完了報告に記載）。 */}
          <div ref={tabAnchorRef} className="scroll-mt-32" />

          {/* MC ↔ 固定 toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
              <button
                onClick={() => setMode('fixed')}
                className={`px-4 py-1.5 ${mode === 'fixed' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                固定モード
              </button>
              <button
                onClick={() => { if (cmpMode === 'scenario') setCmpMode('strategy'); setMode('mc'); }}
                disabled={cmpMode === 'scenario'}
                className={`px-4 py-1.5 ${mode === 'mc' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
              >
                MCモード
              </button>
            </div>
            {mode === 'mc' && (
              <button
                onClick={runMonteCarloWithCorporateAwareness}
                disabled={isMcRunning}
                className="rounded-lg bg-slate-700 text-white text-sm px-4 py-1.5 hover:bg-slate-600 disabled:opacity-50"
              >
                {isMcRunning ? '計算中…' : '1,000試行を実行'}
              </button>
            )}
          </div>
          {mode === 'mc' && mcError && (
            <p className="text-xs text-red-600">{mcError}</p>
          )}

          {/* 比較モード */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">比較モード</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                <button
                  onClick={() => setCmpMode('strategy')}
                  className={`px-3 py-1 ${cmpMode === 'strategy' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  戦略比較
                </button>
                <button
                  onClick={() => { setCmpMode('scenario'); setMode('fixed'); }}
                  className={`px-3 py-1 ${cmpMode === 'scenario' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  シナリオ比較
                </button>
              </div>
            </div>

            {cmpMode === 'strategy' && (
              <div className="flex flex-col gap-1.5">
                {STRATEGY_OPTIONS.map(opt => {
                  const checked = activeStrategies.includes(opt.key);
                  // チェックが1件のみの場合は選択の余地がないためラジオを無効化（比較対象が
                  // 他にないので、その1件を選ぶ以外の意味を持たない）
                  const radioDisabled = !checked || activeStrategies.length <= 1;
                  return (
                    <div key={opt.key} className="flex items-center gap-3">
                      <label className="flex w-20 shrink-0 items-center gap-1 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStrategy(opt.key)}
                          className="rounded"
                        />
                        {opt.label}
                      </label>
                      <label className={`flex items-center gap-1 text-xs ${radioDisabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 cursor-pointer'}`}>
                        <input
                          type="radio"
                          name="displayStrategy"
                          checked={displayStrategy === opt.key}
                          disabled={radioDisabled}
                          onChange={() => setDisplayStrategy(opt.key)}
                        />
                        表示
                      </label>
                    </div>
                  );
                })}
                <span className="text-xs text-slate-400">複数選択でグラフに重ねて表示</span>
              </div>
            )}

            {cmpMode === 'scenario' && (
              <div className="flex gap-3 flex-wrap">
                {SCENARIO_OPTIONS.map(opt => (
                  <label key={opt.key} className={`flex items-center gap-1 text-xs cursor-pointer ${opt.color}`}>
                    <input
                      type="checkbox"
                      checked={activeScenarios.includes(opt.key)}
                      onChange={() => toggleScenario(opt.key)}
                      className="rounded"
                    />
                    {opt.label}
                  </label>
                ))}
                <span className="text-xs text-slate-400">楽観+2% / 中立±0% / 悲観-2%（全口座共通Δ）</span>
              </div>
            )}
          </div>

          {/* 退職後 余剰キャッシュフロー再投資：取崩期に収支が黒字になった年、その差額を
              特定口座で運用継続するかどうかのトグル。比例取崩・現金優先・課税優先の
              取崩戦略選択の直下に置き、「黒字/赤字で挙動が変わる」設定であることが
              視覚的に伝わる位置にする。 */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700">退職後の収支黒字を運用する</span>
              <button
                type="button"
                role="switch"
                aria-checked={!!profile.params.retirementSurplusReinvest}
                onClick={() => updateProfile({ retirementSurplusReinvest: !profile.params.retirementSurplusReinvest })}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  profile.params.retirementSurplusReinvest ? 'bg-blue-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    profile.params.retirementSurplusReinvest ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <span className="text-xs text-slate-400">年金などの収入が支出を上回った場合、その差額を特定口座で運用します。</span>
          </div>

          {cmpMode === 'strategy' && activeStrategies.length > 1 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
              <span aria-hidden="true">ℹ️</span>
              <span>
                戦略比較モード　単一値のKPI・グラフの帯は「{STRATEGY_LABELS[displayStrategy] ?? displayStrategy}」基準。破綻確率の詳細はモンテカルロ分析欄で全戦略を確認できます。
              </span>
            </div>
          )}

          <div ref={kpiRef}>
            <KpiGrid
              analysis={baseAnalysis}
              mcResult={displayMcResult}
              mode={mode}
              strategy={strategy}
              activeStrategies={activeStrategies}
              p={p}
              events={profile.events}
              lifeEx={p.lifeEx}
              retAge={p.retAge}
              lastExpense={lastExpense}
              fireAchievementRate={fireAchievementRate}
              penAge={p.penAge}
              idecoReceiveType={profile.params.idecoReceiveType ?? 'lump'}
              spIdecoReceiveType={profile.params.spIdecoReceiveType ?? 'lump'}
              hasIdeco={profile.params.bIdeco > 0 || profile.params.cIdeco > 0}
              spHasIdeco={(profile.params.spIdecoBal ?? 0) > 0 || (profile.params.spIdecoCon ?? 0) > 0}
              hasSeverance={profile.events.some(ev => ev.subtype === 'severance')}
              corporateFinalTotal={corporateFinalTotal}
              combinedFinalTotal={combinedFinalTotal}
              corporateCombinedBankruptcyRate={corporateCombinedBankruptcyRate}
            />
          </div>

          <AssetChart
            profile={profile}
            snaps={snaps}
            mcResult={displayMcResult}
            mode={mode}
            cmpMode={cmpMode}
            activeStrategies={activeStrategies}
            displayStrategy={displayStrategy}
            activeScenarios={activeScenarios}
            corporateBalance={corporateBalance}
            corporateMcCombined={corporateMcCombined}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MonteCarloPanel />
            <ImpactTable />
          </div>

          <CashFlowChart snaps={baseSnaps} />

          <SensitivityPanel />

          <YearlyTable
            snaps={baseSnaps}
            retAge={p.retAge}
            penAge={p.penAge}
            idecoStartAge={p.idecoStartAge}
            strategy={strategy}
            corporateBalanceByAge={corporateBalanceByAge}
          />

          <AiPanel />
        </div>
      </div>

      <StickyKpiBar
        visible={formInView && !kpiInView}
        fA={baseAnalysis.fA}
        dA={baseAnalysis.dA}
        lifeEx={p.lifeEx}
        minRatio={baseAnalysis.minRatio}
        bankruptcyRate={displayMcResult?.strategies[strategy as keyof typeof displayMcResult.strategies]?.bankruptcyRate}
        corporateFinalTotal={corporateFinalTotal}
        combinedFinalTotal={combinedFinalTotal}
      />
    </div>
  );
}
