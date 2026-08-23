'use client';

import { useMemo, useState } from 'react';
import type { AnalysisResult, LifeEvent, MCResult, SimParams, WithdrawalStrategy } from '@/lib/types';
import KpiCard from '@/components/simulator/KpiCard';
import InfoTooltip from '@/components/simulator/InfoTooltip';
import { STRATEGY_LABELS } from '@/components/simulator/AssetChart';
import { assetLongevityVariant, fireSafetyVariant } from '@/lib/kpi-thresholds';
import { findImprovementThresholds } from '@/lib/improvement-search';
import { useEqualHeight } from '@/hooks/useEqualHeight';
import { useSimulatorStore } from '@/store/simulatorStore';
import { runMonteCarloWithCorporateAwareness } from '@/components/hojinCompanyState/CorporateSettingsSection';
import CorporateCombinedBadge from '@/components/hojinCompanyState/CorporateCombinedBadge';

interface KpiGridProps {
  analysis: AnalysisResult;
  mcResult?: MCResult | null;
  mode: 'fixed' | 'mc';
  // 単一値として表示する代表戦略（=表示戦略）。複数戦略選択時、戦略ごとの詳細は
  // モンテカルロ分析欄（MonteCarloPanel）に表示するため、このカードはstrategy1つ分のみ表示する。
  strategy: string;
  activeStrategies: string[];
  // FIRE達成カード未達成時の改善案探索(findImprovementThresholds)用。
  p: SimParams;
  events: LifeEvent[];
  lifeEx: number;
  retAge: number;
  penAge: number;
  lastExpense: number;
  // 退職時充足率（詳細アコーディオン用）：退職年齢時点1年分のスナップショットで
  // 「資産 ÷ 支出×25」を計算した値。FIRE達成カードの退職後/FIRE達成後最低充足率(minRatio)とは別指標。
  fireAchievementRate: number | null;
  idecoReceiveType?: 'lump' | 'pension' | 'split';
  spIdecoReceiveType?: 'lump' | 'pension' | 'split';
  hasIdeco: boolean;
  spHasIdeco: boolean;
  // 退職金イベントの「存在」を表すフラグ（税引後net>0とは独立。控除内で税額0円のケースも含む）
  hasSeverance: boolean;
  // 法人資産オーバーレイ（最終版指示書3.8節）。includeInPersonalSimulatorトグルON時のみ
  // 呼び出し元(page.tsx)から渡される。
  corporateFinalTotal?: number | null;
  combinedFinalTotal?: number | null;
  // MC破綻確率カードの法人合算バッジ用（UI仕上げ指示書3章：最終資産カード・モンテカルロ分析欄には
  // 既にあったが、このカードだけ実装漏れだったため追加）。
  corporateCombinedBankruptcyRate?: number | null;
}

function fmt(v: number | null | undefined, suffix = '万円'): string {
  if (v == null) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString()}${suffix}`;
}

function SpouseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-slate-500">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TaxSubline({ value }: { value: string }) {
  return (
    <p className="pl-2 text-[11px] text-slate-400">
      累計課税額：{value}（公的年金等控除適用）
    </p>
  );
}

export default function KpiGrid({
  analysis: a, mcResult, mode, strategy, activeStrategies, p, events, lifeEx, retAge, penAge, lastExpense, fireAchievementRate, idecoReceiveType, spIdecoReceiveType,
  hasIdeco, spHasIdeco, hasSeverance, corporateFinalTotal, combinedFinalTotal, corporateCombinedBankruptcyRate,
}: KpiGridProps) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // MC破綻確率カードの「MCモードで実行」をクリック可能にする（mc_bankruptcy_card_clickable）。
  // ImpactTable.tsxの同名リンクと同じ導線（setMode('mc') → 法人トグルを考慮したMC実行）。
  // 2026-08-22修正：runMonteCarlo()を直接呼ぶと法人トグルON時に個人単独MCが実行され、
  // このカード・モンテカルロ分析欄が更新されなかったため、corporate-aware版に差し替えた。
  const { setMode } = useSimulatorStore();

  // トップKPI4枚(資産寿命・FIRE達成・MC破綻確率・最終資産)の高さ統一（tooltip_wrap_fix）。
  // 改善案文言の長さでFIRE達成カードだけ行が高くなっても、min-heightで4枚全部を揃える。
  const { setRef: setKpiCardRef, maxHeight: kpiCardMaxHeight } = useEqualHeight(4);
  const kpiCardWrapperStyle = kpiCardMaxHeight ? { minHeight: kpiCardMaxHeight } : undefined;

  // FIRE達成：達成(fA != null)時はFIRE達成年齢、未達成時は「未達成」を表示。
  // 根拠となるサブ値はminRatio（退職後/FIRE達成後最低充足率）。ラベル文言は状態で出し分ける
  // （lifetime_min_ratio_label_switch.md：達成時「FIRE達成後最低充足率」・未達成時「退職後最低充足率」）。
  const fireAchieved = a.fA != null;
  const minRatioRounded = a.minRatio != null ? Math.round(a.minRatio) : null;
  const minRatioLabel = fireAchieved ? 'FIRE達成後最低充足率' : '退職後最低充足率';
  // 閾値・判定はStickyKpiBar.tsxと共有するfireSafetyVariant()に切り出し済み（sticky_kpi_bar_fire_safety_sync）。
  const fireVariant = fireSafetyVariant(a.minRatio);

  // 未達成時のみ、改善案(支出削減%/退職延長年数)を探索して3行目に表示する（kpi_improvement_suggestion_display）。
  // findImprovementThresholds()は二分探索+線形探索で複数回simulate()を呼ぶため、達成済みカードでは
  // 計算自体を行わない。またpropsのp/eventsは呼び出し元(page.tsx)で毎レンダー新規生成されるため、
  // オブジェクト参照ではなく内容(JSON文字列)をuseMemoの依存キーにして、実質的な入力が変わらない
  // 限り再探索が走らないようにする。
  const improvementKey = fireAchieved ? null : JSON.stringify({ p, events, strategy });
  const improvement = useMemo(() => {
    if (fireAchieved) return null;
    return findImprovementThresholds(p, events, strategy as WithdrawalStrategy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [improvementKey]);

  const isMultiStrategy = activeStrategies.length > 1;
  const mcStrat = mcResult?.strategies[strategy as keyof typeof mcResult.strategies];
  const mcStr   = mcStrat != null ? `${mcStrat.bankruptcyRate.toFixed(1)}%` : null;
  const mcRate  = mcStrat?.bankruptcyRate ?? 100;
  // 新仕様の閾値：5%未満=緑／5〜15%=黄／15%以上=赤（カード全体色分けの構造は維持）
  const mcVariant = mcRate < 5 ? 'good' : mcRate < 15 ? 'warn' : 'danger';

  // 最終資産：新仕様（旧版そのままではない）。0以下=赤/「枯渇」、
  // 0〜最終年支出未満=黄/「残高わずか」、それ以上=緑。閾値は固定額(500万)ではなく
  // 最終年（インフレ調整後・名目）の年間支出1年分を基準にする。
  let lastVariant: 'good' | 'warn' | 'danger';
  let lastValue: string;
  let lastSub: string;
  if (a.last <= 0) {
    lastVariant = 'danger';
    lastValue = '枯渇';
    lastSub = `${lifeEx}歳前に資産ゼロ`;
  } else if (a.last < lastExpense) {
    lastVariant = 'warn';
    lastValue = fmt(a.last);
    lastSub = '残高わずか';
  } else {
    lastVariant = 'good';
    lastValue = fmt(a.last);
    lastSub = `${lifeEx}歳時点で残存`;
  }

  // 初年度取崩率：閾値は旧版(STEP35)通り3%/5%。null時（退職時に資産ゼロ）の専用サブテキストを復元。
  const wr = a.withdrawalRate;
  const wrStr = wr != null ? `${wr.toFixed(1)}%` : '—';
  const wrVariant: 'good' | 'warn' | 'danger' | 'neutral' =
    wr == null ? 'neutral' : wr < 3 ? 'good' : wr < 5 ? 'warn' : 'danger';
  const wrLabel = wr == null ? null : wr < 3 ? '適正' : wr < 5 ? 'やや高め' : '過大';
  const wrSub = wr != null ? `退職直後の引出率・${wrLabel}` : '退職時に資産ゼロ';

  // 資産寿命：値を年齢主役に統一し、3分岐（枯渇＜余命／枯渇≧余命／枯渇なし）を復元。
  // 「枯渇なし」の表示文言自体は維持しつつ、旧版にあった補足テキストを追加する。
  // kpi_grid_redesign.md：黄色を追加（終端年齢の5年以内に枯渇する場合は黄、それより早ければ赤）。
  // 閾値・判定はStickyKpiBar.tsxと共有するassetLongevityVariant()に切り出し済み（sticky_kpi_bar_asset_longevity_sync_1）。
  const dAVariant = assetLongevityVariant(a.dA, lifeEx);
  let dAValue: string;
  let dASub: string;
  if (a.dA != null && a.dA < lifeEx) {
    dAValue = `${a.dA}歳で枯渇`;
    dASub = `退職後${a.assetLife}年で資産ゼロ`;
  } else if (a.dA != null) {
    dAValue = `${lifeEx - 1}歳まで存続`;
    dASub = `${lifeEx}歳時点で資産ゼロ`;
  } else {
    dAValue = '枯渇なし';
    dASub = `${lifeEx}歳時点でも資産残存`;
  }

  // 年金開始までの年数：3分岐（pension_years_basis_switch）。
  // - まだ退職前(curAge < retAge)：penAge - retAge（退職年齢基準、従来通り）
  // - 退職済みだが年金はまだ(retAge <= curAge < penAge)：penAge - curAge（現在年齢基準に切り替え）
  // - 年金も既に受給中(curAge >= penAge、境界含む)：数値ではなく「受給中」と表示（マイナス年数を出さない）
  // curAge・retAge・penAgeという入力値のみで計算できるため、analyze.ts/simulate.tsは変更不要。
  const pensionStarted = p.curAge >= penAge;
  const yearsToPension = pensionStarted
    ? null
    : (p.curAge < retAge ? penAge - retAge : penAge - p.curAge);

  // 年金開始時資産：本人の年金開始年齢（penAge）時点の総資産。退職〜年金開始までの
  // 「年金空白期間」でどれだけ取り崩したかの目安。該当年齢のスナップショットがない場合は
  // 他のKPI（資産寿命・収支転換点等）と同様に「—」で欠損を示す。
  const penAgeValue = fmt(a.penAgeAssets);
  const penAgeSub = a.penAgeAssets != null ? `${penAge}歳時点` : '算出不可';

  // iDeCo受取（手取り）：世帯合計値。受取方式（本人/配偶者それぞれlump/pension/split）に応じて合成する。
  const idecoSelfNet =
    idecoReceiveType === 'pension' ? a.idecoTotalNetWithdrawal :
    idecoReceiveType === 'split'   ? a.idecoLumpNet + a.idecoTotalNetWithdrawal :
    /* lump */                       a.idecoLumpNet;
  const spIdecoSelfNet =
    spIdecoReceiveType === 'pension' ? (a.spIdecoTotalNetWithdrawal ?? 0) :
    spIdecoReceiveType === 'split'   ? (a.spIdecoLumpNet ?? 0) + (a.spIdecoTotalNetWithdrawal ?? 0) :
    /* lump */                         (a.spIdecoLumpNet ?? 0);
  const idecoTier3Value = idecoSelfNet + spIdecoSelfNet;

  const showSpouseRetirement = spIdecoSelfNet > 0 || (a.spRetirementTaxKPI ?? 0) > 0 || (a.spSeveranceNetKPI ?? 0) > 0;

  // 「退職イベント」アコーディオンの表示条件：退職金イベント または iDeCo受給イベント（受取開始）が存在する
  const hasIdecoReceiveEvent = hasIdeco || spHasIdeco;
  const eventsExpandable = hasSeverance || hasIdecoReceiveEvent;

  // 退職所得税（合計）カードの表示条件：退職金イベント または iDeCo一時金受取（lump/split）が存在する場合。
  // 「年金のみ」（公的年金等控除の話であり退職所得控除とは無関係）の場合は非表示。
  const hasIdecoLumpEvent =
    (hasIdeco   && (idecoReceiveType   === 'lump' || idecoReceiveType   === 'split')) ||
    (spHasIdeco && (spIdecoReceiveType === 'lump' || spIdecoReceiveType === 'split'));
  const showRetirementTaxCard = hasSeverance || hasIdecoLumpEvent;

  // 累計課税額サブテキストの表示条件：受取方式が「年金」または「併用」を含む場合のみ（本人・配偶者それぞれ独立に判定）
  const showSelfIdecoTax = idecoReceiveType === 'pension' || idecoReceiveType === 'split';
  const showSpIdecoTax   = spIdecoReceiveType === 'pension' || spIdecoReceiveType === 'split';

  void mode;

  return (
    <div className="flex flex-col gap-3">
      {/* トップKPI：「生涯を通じて安全か」に統一した4枠（モバイル2×2、SM以上1行4列） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div ref={setKpiCardRef(0)} style={kpiCardWrapperStyle}>
          <KpiCard
            label="資産寿命"
            value={dAValue}
            sub={dASub}
            variant={dAVariant}
            tooltip="退職後に資産が枯渇する年齢。「枯渇なし」は終端年齢まで資産がプラスを維持することを示します。終端年齢の5年以内に枯渇する場合は要注意、それより早い場合はリスク大の目安です。"
          />
        </div>
        <div ref={setKpiCardRef(1)} style={kpiCardWrapperStyle}>
          <KpiCard
            label="FIRE達成"
            value={fireAchieved ? `${a.fA}歳で達成` : '未達成'}
            sub={minRatioRounded != null ? `${minRatioLabel} ${minRatioRounded}%` : '算出不可'}
            variant={fireVariant}
            tooltip={`取崩期を通じて資産が「年間支出×25」を下回らない最速の退職年齢。${minRatioLabel}は、${fireAchieved ? 'その年齢以降' : '退職後'}で資産に最も余裕がなかった年（${a.minRatioAge != null ? `${a.minRatioAge}歳` : '算出不可'}）の充足率です。100%以上が安全、80〜100%未満はまだ届いていないものの赤ほど深刻ではない状態、80%未満は要注意の目安です。`}
            footer={improvement && (
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                {improvement.retirement.achievable ? (
                  <InfoTooltip text="退職延長した期間も、現在と同じペースで貯蓄を続けた場合の試算です">
                    {improvement.message}
                  </InfoTooltip>
                ) : (
                  improvement.message
                )}
              </p>
            )}
          />
        </div>
        <div ref={setKpiCardRef(2)} style={kpiCardWrapperStyle}>
          <KpiCard
            label="MC 破綻確率"
            value={mcStr ?? '—'}
            sub={
              mcStr
                ? (isMultiStrategy ? `${STRATEGY_LABELS[strategy] ?? strategy}基準・詳細は下記` : '1,000試行・90歳時点')
                : undefined
            }
            variant={mcStr ? mcVariant : 'neutral'}
            tooltip="モンテカルロ法（1,000試行）で終端年齢時点に資産が枯渇する試行の割合。運用利回りのランダムなブレを考慮しています。5%未満が良好、15%以上は要注意の目安です。複数戦略選択時は表示戦略基準の値を表示し、戦略ごとの内訳はモンテカルロ分析欄をご覧ください。"
            footer={
              !mcStr ? (
                <p className="text-[11px] mt-1 leading-tight">
                  <button
                    type="button"
                    onClick={() => { setMode('mc'); setTimeout(() => runMonteCarloWithCorporateAwareness(), 50); }}
                    className="text-blue-600 hover:underline"
                  >
                    MCモードで実行
                  </button>
                </p>
              ) : corporateCombinedBankruptcyRate != null && (
                <CorporateCombinedBadge className="mt-1">
                  法人合算：破綻確率{corporateCombinedBankruptcyRate.toFixed(1)}%
                </CorporateCombinedBadge>
              )
            }
          />
        </div>
        <div ref={setKpiCardRef(3)} style={kpiCardWrapperStyle}>
          <KpiCard
            label="最終資産"
            value={lastValue}
            sub={lastSub}
            variant={lastVariant}
            tooltip="終端年齢（余命設定）時点の総資産額。最終年の年間支出1年分を下回ると「残高わずか」、0円以下は「枯渇」を示します。"
            footer={combinedFinalTotal != null && (
              <CorporateCombinedBadge className="mt-1">
                法人合算: {fmt(combinedFinalTotal)}（法人 {fmt(corporateFinalTotal ?? 0)} 含む）
              </CorporateCombinedBadge>
            )}
          />
        </div>
      </div>

      {/* 詳細指標：興味があれば深掘りする4枠（モバイル2×2、SM以上1行4列） */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <button
          onClick={() => setDetailsOpen(o => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>詳細指標</span>
          <span className="text-slate-400">{detailsOpen ? '▲' : '▼'}</span>
        </button>
        {detailsOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 pb-4">
            <KpiCard
              label="退職時充足率"
              value={fireAchievementRate != null ? `${fireAchievementRate}%` : '算出不可'}
              sub="退職した瞬間の充足率です"
              tooltip="退職年齢時点1年分のスナップショットで、資産 ÷ (退職時支出×25) を計算した値。FIRE達成カードの「最低充足率」とは異なり、退職後の変動は反映されません。"
            />
            <KpiCard
              label="初年度取崩率"
              value={wrStr}
              sub={wrSub}
              variant={wrVariant}
              tooltip="退職初年度の実質引出額 ÷ 退職時総資産。3%未満が良好、5%以上は要注意の目安です。"
            />
            <KpiCard
              label="年金開始時資産"
              value={penAgeValue}
              sub={penAgeSub}
              tooltip="本人の年金受給開始年齢時点での総資産額。退職からこの年齢までの、いわゆる「年金空白期間」をどれだけ取り崩したかの目安になります。"
            />
            <KpiCard
              label="年金開始までの年数"
              value={yearsToPension != null ? `${yearsToPension}年` : '受給中'}
              sub={yearsToPension != null ? '退職〜年金受給開始' : '既に受給開始済み'}
              tooltip="年金受給開始年齢までの残り年数です。退職前は「年金受給開始年齢 − 退職年齢」、退職後で受給前は「年金受給開始年齢 − 現在年齢」を表示します。この期間は年金収入がないため、資産の取り崩しに依存します。既に受給開始済みの場合は「受給中」と表示します。"
            />
          </div>
        )}
      </div>

      {/* 退職イベント：退職金・iDeCo受給イベントがある場合のみアコーディオンで詳細表示 */}
      {eventsExpandable && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button
            onClick={() => setEventsOpen(o => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>退職イベント</span>
            <span className="text-slate-400">{eventsOpen ? '▲' : '▼'}</span>
          </button>
          {eventsOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
              {hasIdecoReceiveEvent && (
                <KpiCard
                  label="iDeCo（手取り）"
                  value={fmt(idecoTier3Value)}
                  tooltip="iDeCo年金受取期間の合計受取額から、公的年金等控除を適用した税引後の手取り総額(世帯合計)。iDeCo受給開始後は生活費不足を補う取り崩し時に本人・配偶者の残高が合算運用されるため、内訳(本人/配偶者)は互いの設定によって多少変動することがあります。世帯合計自体は変わりません。"
                  footer={
                    <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                      <SpouseRow label="本人" value={fmt(idecoSelfNet)} />
                      {showSelfIdecoTax && <TaxSubline value={fmt(a.idecoTotalTax)} />}
                      {showSpouseRetirement && (
                        <>
                          <SpouseRow label="配偶者" value={fmt(spIdecoSelfNet)} />
                          {showSpIdecoTax && <TaxSubline value={fmt(a.spIdecoTotalTax)} />}
                        </>
                      )}
                    </div>
                  }
                />
              )}
              {hasSeverance && (
                <KpiCard
                  label="退職金（手取り）"
                  value={fmt(a.severanceNetKPI + (a.spSeveranceNetKPI ?? 0))}
                  footer={
                    <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                      <SpouseRow label="本人" value={fmt(a.severanceNetKPI)} />
                      {showSpouseRetirement && <SpouseRow label="配偶者" value={fmt(a.spSeveranceNetKPI)} />}
                    </div>
                  }
                />
              )}
              {showRetirementTaxCard && (
                <KpiCard
                  label="退職所得税（合計）"
                  value={fmt(a.idecoLumpTax + (a.spRetirementTaxKPI ?? 0))}
                  tooltip="iDeCo一時金・退職金の合算課税。退職所得控除を適用した後の実効税額（本人・配偶者の合計）。"
                  footer={
                    <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                      <SpouseRow label="本人" value={fmt(a.idecoLumpTax)} />
                      {showSpouseRetirement && <SpouseRow label="配偶者" value={fmt(a.spRetirementTaxKPI)} />}
                    </div>
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
