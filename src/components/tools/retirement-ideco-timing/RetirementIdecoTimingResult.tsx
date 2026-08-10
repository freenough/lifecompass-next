'use client';

import { calcRetirementIdecoTiming, type ReceiveOrder, type AppliedRule } from '@/lib/tax/retirementIdecoTiming';
import type { RetirementIdecoTimingFormValues } from './RetirementIdecoTimingForm';
import DetailsAccordion from '@/components/tools/DetailsAccordion';
import ToolCard from '@/components/tools/ui/ToolCard';

interface RetirementIdecoTimingResultProps {
  values: RetirementIdecoTimingFormValues;
}

const ORDER_LABEL: Record<ReceiveOrder, string> = {
  retirement_first: '退職金が先',
  ideco_first: 'iDeCoが先',
  same_year: '同一年',
};

const RULE_LABEL: Record<AppliedRule, string> = {
  nineteen_year_rule: '19年ルール',
  ten_year_rule: '10年ルール',
};

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

export default function RetirementIdecoTimingResult({ values }: RetirementIdecoTimingResultProps) {
  const result = calcRetirementIdecoTiming(values);
  const { rule, mode } = result;

  const totalNetManYen = toManYen(result.totalNetAmount);

  const isRetirementFirst = rule.order !== 'ideco_first';
  const firstLabel = isRetirementFirst ? '退職金' : 'iDeCo';
  const secondLabel = isRetirementFirst ? 'iDeCo' : '退職金';
  const firstIncomeManYen = isRetirementFirst ? values.retireIncomeManYen : values.idecoIncomeManYen;
  const secondIncomeManYen = isRetirementFirst ? values.idecoIncomeManYen : values.retireIncomeManYen;

  return (
    <ToolCard variant="result">
      <div className="rounded-lg border border-accent bg-blue-50 p-4">
        <p className="text-sm font-medium text-slate-500">手取り合計(退職金+iDeCo一時金)</p>
        <p className="mt-1 text-4xl sm:text-5xl font-bold text-slate-800 leading-none [text-wrap:balance]">
          {fmt(totalNetManYen)}
          <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
        </p>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 leading-relaxed">
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">受給順序</span>
          <span className="font-medium">{ORDER_LABEL[rule.order]}(受給間隔{rule.interval}年)</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">適用ルール</span>
          <span className="font-medium">{RULE_LABEL[rule.appliedRule]}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">重複排除の対象</span>
          <span className={`font-medium ${rule.isAdjustmentApplicable ? 'text-accent' : ''}`}>
            {mode === 'combined' && '対象(同一年受給・合算方式を適用)'}
            {mode === 'duplicate_adjustment' && '対象(後に受け取った方の控除額を減額計算)'}
            {mode === 'independent' && '対象外(それぞれ独立計算)'}
          </span>
        </div>
      </div>

      {mode === 'combined' && result.combinedResult && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
          <p className="text-xs font-medium text-slate-500 mb-1">
            同一年に受給:退職金({fmt(values.retireIncomeManYen)}万円)+iDeCo({fmt(values.idecoIncomeManYen)}万円)を合算して計算
          </p>
          <div className="flex justify-between py-1 border-t border-slate-100">
            <span className="text-slate-500">合算収入</span>
            <span className="font-medium">{fmt(values.retireIncomeManYen + values.idecoIncomeManYen)}万円</span>
          </div>
          <div className="flex justify-between py-1 border-t border-slate-100">
            <span className="text-slate-500">合算控除額</span>
            <span className="font-medium">{fmt(toManYen(result.combinedResult.deduction))}万円</span>
          </div>
          <div className="flex justify-between py-1 border-t border-slate-100">
            <span className="text-slate-500">課税退職所得</span>
            <span className="font-medium">{fmt(toManYen(result.combinedResult.taxableIncome))}万円</span>
          </div>
          <div className="flex justify-between py-1 border-t border-slate-100">
            <span className="text-slate-500">所得税+住民税</span>
            <span className="font-medium">{fmt(toManYen(result.combinedResult.incomeTax + result.combinedResult.residentTax.total))}万円</span>
          </div>
          <div className="flex justify-between py-2 border-t border-slate-300 mt-1">
            <span className="font-semibold text-slate-700">手取り合計</span>
            <span className="font-bold text-accent">{fmt(totalNetManYen)}万円</span>
          </div>
        </div>
      )}

      {mode === 'independent' && result.firstResult && result.secondResult && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
          <p className="text-xs font-medium text-slate-500 mb-1">
            {firstLabel}({fmt(firstIncomeManYen)}万円)
          </p>
          <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
            <span className="text-slate-500">手取り</span>
            <span className="font-semibold">{fmt(toManYen(result.firstResult.netAmount))}万円</span>
          </div>

          <p className="text-xs font-medium text-slate-500 mt-3 mb-1">
            {secondLabel}({fmt(secondIncomeManYen)}万円)
          </p>
          <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
            <span className="text-slate-500">手取り</span>
            <span className="font-semibold">{fmt(toManYen(result.secondResult.netAmount))}万円</span>
          </div>

          <div className="flex justify-between py-2 border-t border-slate-300 mt-3">
            <span className="font-semibold text-slate-700">手取り合計</span>
            <span className="font-bold text-accent">{fmt(totalNetManYen)}万円</span>
          </div>
        </div>
      )}

      {mode === 'duplicate_adjustment' && result.adjustment && result.firstResult && result.secondResult && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
          <p className="text-xs font-medium text-slate-500 mb-1">
            先に受け取った方:{firstLabel}({fmt(firstIncomeManYen)}万円)
          </p>
          <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
            <span className="text-slate-500">手取り(変更なし)</span>
            <span className="font-semibold">{fmt(toManYen(result.firstResult.netAmount))}万円</span>
          </div>

          <p className="text-xs font-medium text-slate-500 mt-3 mb-1">
            後に受け取った方:{secondLabel}({fmt(secondIncomeManYen)}万円)
          </p>
          <div className="text-sm text-slate-700">
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">重複期間</span>
              <span className="font-medium">
                {result.adjustment.overlapYears}年
                {result.adjustment.deemed.applied && <span className="text-[11px] text-accent ml-1">(みなし調整後)</span>}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">控除額</span>
              <span className="font-medium">
                通常{fmt(toManYen(result.adjustment.secondFullDeduction))}万円 → 重複調整後{fmt(toManYen(result.adjustment.secondAdjustedDeduction))}万円
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">課税退職所得</span>
              <span className="font-medium">{fmt(toManYen(result.secondResult.taxableIncome))}万円</span>
            </div>
            <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50 mt-1">
              <span className="text-slate-500">手取り</span>
              <span className="font-semibold">{fmt(toManYen(result.secondResult.netAmount))}万円</span>
            </div>
          </div>

          {result.adjustment.deemed.applied && (
            <p className="mt-2 text-[11px] text-accent leading-relaxed">
              ※先に受け取った方の収入額が、通常の退職所得控除額({fmt(toManYen(result.adjustment.deemed.fullDeduction))}万円)に満たないため、
              「みなし勤続期間の特例」(所得税法施行令第70条第2項)が適用されています。
            </p>
          )}

          <div className="flex justify-between py-2 border-t border-slate-300 mt-3">
            <span className="font-semibold text-slate-700">手取り合計</span>
            <span className="font-bold text-accent">{fmt(totalNetManYen)}万円</span>
          </div>
        </div>
      )}

      <div className="mt-3 rounded-lg bg-warn-bg p-3 text-xs text-warn-text leading-relaxed">
        本ツールの結果は源泉徴収時点の概算です。実際の確定申告での精算額とは異なる場合があります。還付が生じる場合は確定申告が必要です。
      </div>

      <DetailsAccordion label="計算根拠を見る" className="mt-4">
        <p>
          本ツールは、退職金とiDeCo一時金を異なる年齢で受け取る場合の「受給タイミングによる手取り額の違い」を試算します。
          税額計算(退職所得控除・累進課税・住民税)は、第5弾ツール(退職金手取り計算ツール)・第6弾ツール(iDeCo/DC出口戦略シミュレーター)と
          同じsrc/lib/tax/retirement.ts・ideco.tsの関数をそのまま使用しています。
        </p>
        <p>
          <strong>重複排除ルール(19年ルール・10年ルール)について</strong><br />
          退職金とiDeCo一時金を近い時期に受け取ると、退職所得控除の枠が重複して二重に使われることを防ぐため、
          先に受け取った側の勤続(加入)期間と重複する部分を、後に受け取った側の控除額から差し引く調整が行われます。
          退職金が先(同一年齢を含む)の場合は受給間隔19年以内、iDeCoが先の場合は受給間隔9年以内(=10年以上空ければ対象外になるため「10年ルール」と通称されます)が対象です。
          根拠は国税庁タックスアンサーNo.2735・所得税法施行令第70条です。詳細はdocs/fixes/done/REFERENCE_retirement_ideco_tax_rules.mdを参照しています。
        </p>
        <p>
          <strong>計算方式は受給パターンによって異なります</strong><br />
          同一年に受け取る場合は、収入を合算し勤続年数は長い方を採用して1本で計算します(所得税法第30条第5項)。
          異なる年に受け取り、かつ重複排除の対象になる場合は、先に受け取った方の税額は完全に固定したまま、
          後に受け取った方の控除額のみを、重複期間を勤続年数とみなして計算した金額だけ減額します(所得税法施行令第70条第1項第2号)。
          さらに、先に受け取った方の収入額が自身の退職所得控除額に満たない場合は、「みなし勤続期間の特例」(同条第2項)により、
          重複期間の計算に使う先に受け取った方の期間がより短く調整されます。
        </p>
        <p>以下は対象外です:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本ツールは一般的な退職金・iDeCo一時金の受け取りを対象としています。役員退職金等(特定役員退職手当等・短期退職手当等)は対象外です</li>
          <li>本ツールは現行制度(令和8年1月1日以降の税制)を前提としています。旧ルールとの年度切替は扱っていません</li>
          <li>所得税法施行令第70条第1項第1号(同一の使用者以外の他の者から前に退職手当等の支払を受けている場合の規定)には対応していません</li>
          <li>年未満の端数(月単位等)には対応していません。年単位の整数入力のみに対応しています</li>
        </ul>
        <p className="pt-2 border-t border-slate-100">
          実際の税額・還付要否は所轄の税務署・税理士にご確認ください。
        </p>
      </DetailsAccordion>
    </ToolCard>
  );
}
