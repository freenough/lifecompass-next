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
  const { overlap, rule } = result;

  const totalNetManYen = toManYen(result.totalNetAmount);
  const firstWithholdingManYen = toManYen(result.firstWithholdingTax);
  const secondWithholdingManYen = toManYen(result.secondWithholdingTax);

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
          <span className="text-slate-500">重複期間</span>
          <span className="font-medium">{overlap.overlapYears}年(合算勤続年数{overlap.combinedServiceYears}年)</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">適用ルール</span>
          <span className="font-medium">{RULE_LABEL[rule.appliedRule]}</span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-slate-500">重複排除の対象</span>
          <span className={`font-medium ${rule.isAdjustmentApplicable ? 'text-accent' : ''}`}>
            {rule.isAdjustmentApplicable ? '対象(合算計算を適用)' : '対象外(それぞれ独立計算)'}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700">
        <p className="text-xs font-medium text-slate-500 mb-1">
          1回目受給:{firstLabel}({fmt(firstIncomeManYen)}万円)
        </p>
        <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
          <span className="text-slate-500">源泉徴収税額</span>
          <span className="font-semibold">{fmt(firstWithholdingManYen)}万円</span>
        </div>

        <p className="text-xs font-medium text-slate-500 mt-3 mb-1">
          2回目受給:{secondLabel}({fmt(secondIncomeManYen)}万円)
        </p>
        <div className="flex justify-between py-1.5 px-2 -mx-2 rounded bg-blue-50">
          <span className="text-slate-500">源泉徴収税額</span>
          <span className="font-semibold">{fmt(secondWithholdingManYen)}万円</span>
        </div>

        <div className="flex justify-between py-2 border-t border-slate-300 mt-3">
          <span className="font-semibold text-slate-700">手取り合計</span>
          <span className="font-bold text-accent">{fmt(totalNetManYen)}万円</span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-warn-bg p-3 text-xs text-warn-text leading-relaxed">
        2回目の源泉徴収税額がマイナスとなる場合(0万円表示)、実際にはその分の税額が源泉徴収されていない可能性があります。還付を受けるには確定申告が必要です。
      </div>

      <DetailsAccordion label="計算根拠を見る" className="mt-4">
        <p>
          本ツールは、退職金とiDeCo一時金を異なる年齢で受け取る場合の「受給タイミングによる手取り額の違い」を試算します。
          税額計算(退職所得控除・累進課税・住民税)は、第5弾ツール(退職金手取り計算ツール)と同じ
          src/lib/tax/retirement.tsの関数をそのまま使用しています。
        </p>
        <p>
          <strong>重複排除ルール(19年ルール・10年ルール)について</strong><br />
          退職金とiDeCo一時金を近い時期に受け取ると、退職所得控除の枠が重複して二重に使われることを防ぐため、
          国税庁タックスアンサーNo.2735に基づき、先に受け取った側の勤続(加入)期間と重複する部分を控除の計算対象から除外する調整が行われます。
          退職金が先(同一年齢を含む)の場合は受給間隔19年以内、iDeCoが先の場合は受給間隔9年以内(=10年以上空ければ対象外になるため「10年ルール」と通称されます)が対象です。
          詳細はdocs/fixes/done/REFERENCE_retirement_ideco_tax_rules.mdを参照しています。
        </p>
        <p>
          <strong>2回目の源泉徴収税額について</strong><br />
          調整対象になる場合、「退職金+iDeCo一時金を合算し、合算勤続年数(重複期間を除いた「長い方の期間+短い方の非重複部分」)で計算した税額」から、
          「1回目の受給額のみで独立計算した税額(実際に1回目に源泉徴収された額)」を差し引いた差額を、2回目の源泉徴収税額としています。
        </p>
        <p>以下は対象外です:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本ツールは一般的な退職金・iDeCo一時金の受け取りを対象としています。役員退職金等(特定役員退職手当等・短期退職手当等)は対象外です</li>
          <li>本ツールは現行制度(令和8年1月1日以降の税制)を前提としています。旧ルールとの年度切替は扱っていません</li>
          <li>国税庁の例外規定(所得税法施行令第70条。先行受給額が自身の退職所得控除額に満たない場合の「みなし勤続期間」を用いる特殊計算)には対応していません</li>
          <li>年未満の端数(月単位等)には対応していません。年単位の整数入力のみに対応しています</li>
        </ul>
        <p className="pt-2 border-t border-slate-100">
          実際の税額・還付要否は所轄の税務署・税理士にご確認ください。
        </p>
      </DetailsAccordion>
    </ToolCard>
  );
}
