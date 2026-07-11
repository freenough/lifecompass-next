'use client';

import { useState } from 'react';
import type { AnalysisResult, MCResult } from '@/lib/types';
import KpiCard from '@/components/simulator/KpiCard';
import { STRATEGY_LABELS } from '@/components/simulator/AssetChart';

interface KpiGridProps {
  analysis: AnalysisResult;
  mcResult?: MCResult | null;
  mode: 'fixed' | 'mc';
  // 単一値として表示する代表戦略（=表示戦略）。複数戦略選択時、戦略ごとの詳細は
  // モンテカルロ分析欄（MonteCarloPanel）に表示するため、このカードはstrategy1つ分のみ表示する。
  strategy: string;
  activeStrategies: string[];
  lifeEx: number;
  penAge: number;
  lastExpense: number;
  fireAchievementRate: number | null;
  fireAchievementRateAtFA: number | null;
  idecoReceiveType?: 'lump' | 'pension' | 'split';
  spIdecoReceiveType?: 'lump' | 'pension' | 'split';
  hasIdeco: boolean;
  spHasIdeco: boolean;
  // 退職金イベントの「存在」を表すフラグ（税引後net>0とは独立。控除内で税額0円のケースも含む）
  hasSeverance: boolean;
}

function fmt(v: number | null | undefined, suffix = '万円'): string {
  if (v == null) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString()}${suffix}`;
}

function ageStr(v: number | null | undefined): string {
  return v == null ? '—' : `${v}歳`;
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
  analysis: a, mcResult, mode, strategy, activeStrategies, lifeEx, penAge, lastExpense, fireAchievementRate, fireAchievementRateAtFA, idecoReceiveType, spIdecoReceiveType,
  hasIdeco, spHasIdeco, hasSeverance,
}: KpiGridProps) {
  const [eventsOpen, setEventsOpen] = useState(false);

  // FIRE達成: 達成時はFIRE達成年齢時点、未達成時は退職予定年齢時点のスナップショットで「達成率（資産 ÷ 支出×25）」を表示する
  const fireAchieved = a.fA != null;

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
  const wrSub = wr != null ? '退職直後の引出率' : '退職時に資産ゼロ';

  // 資産寿命：値を年齢主役に統一し、3分岐（枯渇＜余命／枯渇≧余命／枯渇なし）を復元。
  // 「枯渇なし」の表示文言自体は維持しつつ、旧版にあった補足テキストを追加する。
  let dAVariant: 'good' | 'danger';
  let dAValue: string;
  let dASub: string;
  if (a.dA != null && a.dA < lifeEx) {
    dAVariant = 'danger';
    dAValue = `${a.dA}歳で枯渇`;
    dASub = `退職後${a.assetLife}年で資産ゼロ`;
  } else if (a.dA != null) {
    dAVariant = 'danger';
    dAValue = `${lifeEx - 1}歳まで存続`;
    dASub = `${lifeEx}歳時点で資産ゼロ`;
  } else {
    dAVariant = 'good';
    dAValue = '枯渇なし';
    dASub = `${lifeEx}歳時点でも資産残存`;
  }

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
      {/* メインKPI：常時表示6枠（モバイル2列→3行、SM以上3列→2行） */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          label="資産寿命"
          value={dAValue}
          sub={dASub}
          variant={dAVariant}
          tooltip="退職後に資産が枯渇する年齢。「枯渇なし」は終端年齢まで資産がプラスを維持することを示します。"
        />
        <KpiCard
          label="FIRE達成"
          value={fireAchieved ? ageStr(a.fA) : '未達成'}
          sub={
            fireAchieved
              ? (fireAchievementRateAtFA != null ? `達成率 ${fireAchievementRateAtFA}%` : '算出不可')
              : (fireAchievementRate != null ? `達成率 ${fireAchievementRate}%` : '算出不可')
          }
          variant={fireAchieved ? 'good' : 'warn'}
          tooltip="取崩期を通じて資産が「年間支出×25」を下回らない最速の退職年齢。達成できない場合は「未達成」を表示します。FIRE達成率は、達成時はFIRE達成年齢時点、未達成時は退職予定年齢時点の資産が、「年間支出×25」の何%に達しているかを表します。"
        />
        <KpiCard
          label="MC 破綻確率"
          value={mcStr ?? '—'}
          sub={
            mcStr
              ? (isMultiStrategy ? `${STRATEGY_LABELS[strategy] ?? strategy}基準・詳細は下記` : '1,000試行・90歳時点')
              : 'MCモードで実行'
          }
          variant={mcStr ? mcVariant : 'neutral'}
          tooltip="モンテカルロ法（1,000試行）で終端年齢時点に資産が枯渇する試行の割合。運用利回りのランダムなブレを考慮しています。5%未満が良好、15%以上は要注意の目安です。複数戦略選択時は表示戦略基準の値を表示し、戦略ごとの内訳はモンテカルロ分析欄をご覧ください。"
        />
        <KpiCard
          label="最終資産"
          value={lastValue}
          sub={lastSub}
          variant={lastVariant}
          tooltip="終端年齢（余命設定）時点の総資産額。最終年の年間支出1年分を下回ると「残高わずか」、0円以下は「枯渇」を示します。"
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
