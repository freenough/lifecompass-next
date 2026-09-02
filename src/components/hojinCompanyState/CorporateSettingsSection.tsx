'use client';

// 個人シミュレーター本体（/app）の「個人設定欄」（SimulatorForm.tsx、非ロック）に統合する
// 法人設定セクション（最終版指示書3.9節）。トグルON時のみ法人の入力欄を展開表示する。
//
// トグルの状態はcompanyStateStoreで保持し（simulatorStoreには一切依存しない）、
// トグルON時／ON状態での法人側入力値変更時に、明示的に
// simulatorStore.getState().setExtraEvents(...) を呼んで個人側へ反映する
// （Zustandのsubscribeによるストア間の自動連携は使わない）。

import { useEffect } from 'react';
import { useSimulatorStore } from '@/store/simulatorStore';
import { profileToSimParams } from '@/lib/profile';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import { buildCorporateGeneratedEventsFromSnaps } from '@/lib/hojinCompanyState/buildCombinedSimulationInput';
import { simulateCorporateAssets } from '@/lib/hojinCompanyState/corporateGrowth';
import { runCombinedSimulation } from '@/lib/hojinCompanyState/mc';
import CorporateEventTimeline from '@/components/hojinCompanyState/CorporateEventTimeline';
import CorporatePortfolioPanel from '@/components/hojinCompanyState/CorporatePortfolioPanel';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

/**
 * 既存の「1,000試行を実行」ボタン（src/app/app/page.tsx）から呼ばれる、法人トグルを考慮した
 * MC実行の分岐ロジック（3.9節）。トグルOFF時は従来通りsimulatorStore.runMonteCarlo()、
 * ON時はmc.tsのrunCombinedSimulation(..., 'mc')を呼び、結果をcompanyStateStore側に格納する。
 * simulatorStore.runMonteCarlo()自体には一切手を加えない。
 */
export function runMonteCarloWithCorporateAwareness(): void {
  const includeInPersonalSimulator = useCompanyStateStore.getState().state.settings.includeInPersonalSimulator;
  if (!includeInPersonalSimulator) {
    useSimulatorStore.getState().runMonteCarlo();
    return;
  }
  const { state } = useCompanyStateStore.getState();
  const { profile, displayStrategy } = useSimulatorStore.getState();
  const p = profileToSimParams(profile);
  // MCモードでは3戦略（比例取崩／現金優先／課税優先）すべてを計算するため、strategy引数は
  // mc.ts内部では使われない（固定計算モードとシグネチャを揃えるために残している）。
  const result = runCombinedSimulation(
    p, profile.events, displayStrategy, state.settings, state.portfolio, state.events, 'mc',
  );
  useCompanyStateStore.getState().setCombinedMcResult(result);
}

export default function CorporateSettingsSection() {
  // instruction_phase2_companystate_rearchitecture.md 1〜2節：CompanyStateはシミュレーター
  // プロファイル自体の一部として保存・切替される（simulatorStore.loadProfile()経由）。資産管理
  // ツール側プロファイルとは無関係。専用の保存UI（未保存バナー・保存ボタン）も撤去済み——保存は
  // シミュレーター側の通常の保存操作（ProfileDrawer）にそのまま相乗りする。
  const includeInPersonalSimulator = useCompanyStateStore(s => s.state.settings.includeInPersonalSimulator);
  const setIncludeInPersonalSimulator = useCompanyStateStore(s => s.setIncludeInPersonalSimulator);
  const events = useCompanyStateStore(s => s.state.events);
  const settings = useCompanyStateStore(s => s.state.settings);
  const portfolio = useCompanyStateStore(s => s.state.portfolio);
  const effectiveTaxRate = settings.effectiveTaxRate;
  const retirementAge = settings.retirementAge;
  const setEffectiveTaxRate = useCompanyStateStore(s => s.setEffectiveTaxRate);
  const setRetirementAge = useCompanyStateStore(s => s.setRetirementAge);
  const profile = useSimulatorStore(s => s.profile);

  // トグルON時、またはON状態で法人側の入力値（取崩イベント・実効税率・PF・残高・個人側の
  // curAge/lifeEx等）が変更された時、個人側simulatorStoreのextraEventsへ明示的に反映する。
  // OFF時は即座に[]へ戻す。
  //
  // 2026-08-23バグ修正：以前はbuildCorporateGeneratedEvents（イベントの要求額をそのまま使う
  // 静的な変換）を使っていたため、固定モードのKPIカード・グラフ・表（すべてextraEvents経由）が
  // 「法人資産が枯渇した年以降も個人側は満額の収入を受け取り続ける」という誤った前提で表示されて
  // いた。simulateCorporateAssets(z=null)で法人の実際の（残高不足による減額を含む）取崩額を
  // 先に計算し、その実額からextraEventsを生成するよう修正した（mc.tsの固定計算モード・MCモードと
  // 同じロジックに統一）。
  useEffect(() => {
    const setExtraEvents = useSimulatorStore.getState().setExtraEvents;
    if (!includeInPersonalSimulator) {
      setExtraEvents([]);
      return;
    }
    const p = profileToSimParams(profile);
    const corporateSnaps = simulateCorporateAssets(settings, p.curAge, p.lifeEx, portfolio, events, null);
    setExtraEvents(buildCorporateGeneratedEventsFromSnaps(corporateSnaps, effectiveTaxRate));
  }, [includeInPersonalSimulator, events, effectiveTaxRate, settings, portfolio, profile]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700">法人資産を含める</span>
        <button
          type="button"
          role="switch"
          aria-checked={includeInPersonalSimulator}
          onClick={() => setIncludeInPersonalSimulator(!includeInPersonalSimulator)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            includeInPersonalSimulator ? 'bg-blue-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              includeInPersonalSimulator ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {includeInPersonalSimulator && (
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-600 mb-1">事業タイムライン</h3>
            <CorporateEventTimeline />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-600 mb-1">法人ポートフォリオ</h3>
            <CorporatePortfolioPanel />
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-slate-500">法人の退職（事業引退）年齢</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={retirementAge}
                min={0}
                onFocus={e => clearZeroOrSelect(e.currentTarget)}
                onClick={e => clearZeroOrSelect(e.currentTarget)}
                onChange={e => {
                  const cleaned = stripLeadingZero(e.target.value);
                  if (cleaned !== e.target.value) e.target.value = cleaned;
                  const n = e.target.valueAsNumber;
                  setRetirementAge(isNaN(n) ? 0 : n);
                }}
                className="w-16 text-xs border border-slate-300 rounded px-1 py-1 text-right"
              />
              <span className="text-xs text-slate-400">歳</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">実効税率</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={effectiveTaxRate}
                min={0}
                max={100}
                onFocus={e => clearZeroOrSelect(e.currentTarget)}
                onClick={e => clearZeroOrSelect(e.currentTarget)}
                onChange={e => {
                  const cleaned = stripLeadingZero(e.target.value);
                  if (cleaned !== e.target.value) e.target.value = cleaned;
                  const n = e.target.valueAsNumber;
                  setEffectiveTaxRate(isNaN(n) ? 0 : n);
                }}
                className="w-16 text-xs border border-slate-300 rounded px-1 py-1 text-right"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
              目安：20〜30%程度（役員報酬として受け取る場合の所得税・住民税・社会保険料の合計負担率の概算）。精緻な税務計算ではなく、ご自身の見積もりとして入力してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
