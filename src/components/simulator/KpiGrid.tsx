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
  retAge: number;
  lifeEx: number;
  idecoStartAge: number;
  lastExpense: number;
  fireAchievementRate: number | null;
  fireAchievementRateAtFA: number | null;
  idecoReceiveType?: 'lump' | 'pension' | 'split';
  hasIdeco: boolean;
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

function DetailBreakdown({ selfValue, spValue, showSpouse }: { selfValue: string; spValue: string; showSpouse: boolean }) {
  return (
    <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
      <SpouseRow label="本人" value={selfValue} />
      {showSpouse && <SpouseRow label="配偶者" value={spValue} />}
    </div>
  );
}

export default function KpiGrid({
  analysis: a, mcResult, mode, strategy, activeStrategies, retAge, lifeEx, idecoStartAge, lastExpense, fireAchievementRate, fireAchievementRateAtFA, idecoReceiveType,
  hasIdeco, hasSeverance,
}: KpiGridProps) {
  const [tier4Open, setTier4Open] = useState(false);

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

  // 収支転換点：3分岐（転換点あり／算出不可(資産枯渇)／転換なし）を復元。
  let breakEvenVariant: 'good' | 'warn' | 'danger';
  let breakEvenValue: string;
  let breakEvenSub: string;
  if (a.breakEven != null) {
    breakEvenVariant = 'warn';
    breakEvenValue = `${a.breakEven}歳`;
    const yearsAfterRet = a.breakEven - retAge;
    breakEvenSub = `退職${yearsAfterRet > 0 ? yearsAfterRet + '年後から' : '直後から'}支出超過`;
  } else if (a.dA != null) {
    breakEvenVariant = 'danger';
    breakEvenValue = '—';
    breakEvenSub = '算出不可（資産枯渇）';
  } else {
    breakEvenVariant = 'good';
    breakEvenValue = '転換なし';
    breakEvenSub = `${lifeEx}歳まで収支均衡`;
  }

  // iDeCo受取（手取り）：iDeCo未設定でもカードは常時表示し、受取方式(年金/一時金)×
  // 受取前後の4パターンの補足テキストを復元する。splitは旧版に存在しない現行独自機能のため
  // 従来通りの合算表示を維持する。
  let idecoValue: string;
  let idecoSub: string | undefined;
  if (!hasIdeco) {
    idecoValue = '—';
    idecoSub = 'iDeCo口座が未設定';
  } else if (idecoReceiveType === 'split') {
    idecoValue = fmt(a.idecoLumpNet + a.idecoTotalNetWithdrawal);
    idecoSub = `一時金 ${fmt(a.idecoLumpNet)} ／ 年金 ${fmt(a.idecoTotalNetWithdrawal)}`;
  } else if (idecoReceiveType === 'pension') {
    if (a.idecoTotalNetWithdrawal > 0) {
      idecoValue = fmt(a.idecoTotalNetWithdrawal);
      idecoSub = `累計課税額：${fmt(a.idecoTotalTax)}（公的年金等控除適用）`;
    } else {
      idecoValue = '—';
      idecoSub = `${idecoStartAge}歳から年金受取開始`;
    }
  } else {
    if (a.idecoLumpNet > 0) {
      idecoValue = fmt(a.idecoLumpNet);
      idecoSub = a.severanceNetKPI > 0
        ? '詳細は下記'
        : (a.idecoLumpTax > 0 ? `退職所得税：${fmt(a.idecoLumpTax)}` : '退職所得税：なし（控除内）');
    } else {
      idecoValue = '—';
      idecoSub = `${idecoStartAge}歳時点で受取`;
    }
  }

  // Spouse retirement display condition
  const showSpouseRetirement = (a.spIdecoLumpNet ?? 0) > 0 || (a.spRetirementTaxKPI ?? 0) > 0 || (a.spSeveranceNetKPI ?? 0) > 0;

  const tier4Expandable = hasIdeco || hasSeverance;

  // Tier3 iDeCo value: household total (main + spouse)
  const idecoSelfNet =
    idecoReceiveType === 'lump'    ? a.idecoLumpNet :
    idecoReceiveType === 'pension' ? a.idecoTotalNetWithdrawal :
    /* split */                      a.idecoLumpNet + a.idecoTotalNetWithdrawal;
  const idecoTier3Value = idecoSelfNet + (a.spIdecoLumpNet ?? 0);

  void mode;

  return (
    <div className="flex flex-col gap-3">
      {/* Tier1+Tier2: 6枚を1グリッドに統合（モバイル2列→3行、SM以上3列→2行） */}
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
          label="収支転換点"
          value={breakEvenValue}
          sub={breakEvenSub}
          variant={breakEvenVariant}
          tooltip="年金等の収入が生活費を下回り始める年齢。この年齢以降、資産の取崩ペースが加速します。年金受給開始により後ろにずれることがあります。"
        />
      </div>

      {/* Tier3: 資産ピーク（常時）/ iDeCo受取（hasIdecoのとき） */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="資産ピーク"
          value={fmt(a.pV)}
          sub={ageStr(a.pA)}
          tooltip="シミュレーション期間中の総資産の最高値とその年齢。積立期の最後付近か、退職金受取年になることが多いです。"
        />
        <KpiCard
          label="iDeCo受取（手取り）"
          value={idecoValue}
          sub={idecoSub}
          tooltip={
            !hasIdeco
              ? 'iDeCo口座の残高・積立が設定されていません。'
              : idecoReceiveType === 'lump'
                ? `iDeCo一時金から退職所得控除（退職金と合算）を適用した税引後の手取り額。${showSpouseRetirement ? '配偶者のiDeCo受取を含む世帯合計。' : ''}`
                : idecoReceiveType === 'split'
                  ? '一時金部分は退職所得控除を適用した手取り額、年金部分は公的年金等控除を適用した累計手取り額の合計。'
                  : 'iDeCo年金受取期間の合計受取額から、公的年金等控除を適用した税引後の手取り総額。'
          }
          footer={
            tier4Expandable ? (
              <button
                onClick={() => setTier4Open(o => !o)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              >
                {tier4Open ? '▲ 閉じる' : '▼ 詳細'}
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Tier4: iDeCo詳細（一時金受取・展開時のみ） */}
      {tier4Expandable && tier4Open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard
            label="iDeCo（手取り）"
            value={fmt(idecoTier3Value)}
            footer={
              <DetailBreakdown
                selfValue={fmt(idecoSelfNet)}
                spValue={fmt(a.spIdecoLumpNet)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
          <KpiCard
            label="退職金（手取り）"
            value={fmt(a.severanceNetKPI + (a.spSeveranceNetKPI ?? 0))}
            footer={
              <DetailBreakdown
                selfValue={fmt(a.severanceNetKPI)}
                spValue={fmt(a.spSeveranceNetKPI)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
          <KpiCard
            label="退職所得税（合計）"
            value={fmt(a.idecoLumpTax + (a.spRetirementTaxKPI ?? 0))}
            tooltip="iDeCo一時金・退職金の合算課税。退職所得控除を適用した後の実効税額（本人・配偶者の合計）。"
            footer={
              <DetailBreakdown
                selfValue={fmt(a.idecoLumpTax)}
                spValue={fmt(a.spRetirementTaxKPI)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
          {idecoReceiveType === 'split' && (
            <KpiCard
              label="iDeCo内訳（本人）"
              value={fmt(idecoSelfNet)}
              footer={
                <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
                  <SpouseRow label={`一時金(${fmt(a.idecoLumpNet)})`} value={`税 ${fmt(a.idecoLumpTax)}`} />
                  <SpouseRow label={`年金累計(${fmt(a.idecoTotalNetWithdrawal)})`} value={`税 ${fmt(a.idecoTotalTax - a.idecoLumpTax)}`} />
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
