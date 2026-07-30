'use client';

import { calcLumpSumPattern, calcPensionPattern, calcMixedPattern, type WithdrawalPatternResult } from '@/lib/tax/ideco';
import type { IdecoWithdrawalFormValues, ReceiveMethod } from './IdecoWithdrawalForm';
import DetailsAccordion from '@/components/tools/DetailsAccordion';

interface IdecoWithdrawalResultProps {
  values: IdecoWithdrawalFormValues;
}

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

const METHOD_LABEL: Record<ReceiveMethod, string> = {
  lump: '一時金',
  pension: '年金',
  mixed: '併用',
};

export default function IdecoWithdrawalResult({ values }: IdecoWithdrawalResultProps) {
  const input = {
    idecoBalance: values.idecoBalanceManYen * 10_000,
    idecoYrs: values.idecoYrs,
    receiveAge: values.receiveAge,
    publicPensionAnnual: values.publicPensionAnnualManYen * 10_000,
    otherIncome: values.otherIncomeManYen * 10_000,
    severance: values.severanceManYen * 10_000,
    sevYrs: values.sevYrs,
    annuityYears: values.annuityYears,
  };

  const results: Record<ReceiveMethod, WithdrawalPatternResult> = {
    lump: calcLumpSumPattern(input),
    pension: calcPensionPattern(input),
    mixed: calcMixedPattern(input, values.lumpSumRatioPct),
  };

  const order: ReceiveMethod[] = ['lump', 'pension', 'mixed'];
  const best = order.reduce((a, b) => (results[b].netAmount > results[a].netAmount ? b : a));
  const selected = results[values.receiveMethod];
  const selectedLabel = METHOD_LABEL[values.receiveMethod];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-slate-500">
        {values.annuityYears}年間で比較した手取り総額(概算)
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
        {order.map(key => {
          const r = results[key];
          const isBest = key === best;
          const isSelected = key === values.receiveMethod;
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${
                isSelected ? 'border-accent bg-blue-50' : 'border-slate-200'
              }`}
            >
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                {METHOD_LABEL[key]}
                {isBest && <span className="text-[10px] font-bold text-accent">最大</span>}
              </p>
              <p className="mt-1 text-lg sm:text-xl font-bold text-slate-800 leading-tight">
                {fmt(toManYen(r.netAmount))}<span className="text-xs font-medium ml-0.5">万円</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">税額 {fmt(toManYen(r.totalTax))}万円</p>
              <p className="text-xs text-slate-500">実効税率 {fmtPct(r.effectiveTaxRate)}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        この試算条件では、<span className="font-semibold text-accent">{METHOD_LABEL[best]}</span>での受取が手取り最大(概算)です。
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm font-semibold text-slate-700 mb-2">{selectedLabel}パターンの内訳</p>

        {!(values.receiveMethod === 'pension' && values.severanceManYen === 0) ? (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-500 mb-1">一時金分(退職所得課税、一括受給)</p>
            <div className="text-sm text-slate-700">
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">退職所得控除</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.deduction))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">課税退職所得</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.taxableIncome))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">所得税+住民税</span>
                <span className="font-medium">{fmt(toManYen(selected.lumpSum.incomeTax + selected.lumpSum.residentTax.total))}万円</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-100">
                <span className="text-slate-500">一時金分の手取り</span>
                <span className="font-semibold">{fmt(toManYen(selected.lumpSum.netAmount))}万円</span>
              </div>
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            年金分(総合課税、{values.annuityYears}年間・1年あたり)
          </p>
          <div className="text-sm text-slate-700">
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">公的年金等控除</span>
              <span className="font-medium">{fmt(toManYen(selected.pension.deduction))}万円</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">雑所得(公的年金+DC年金)</span>
              <span className="font-medium">{fmt(toManYen(selected.pension.taxableIncome))}万円</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">所得税の基礎控除</span>
              <span className="font-medium">{fmt(toManYen(selected.comprehensive.basicDeduction))}万円</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">所得税+復興特別所得税</span>
              <span className="font-medium">{fmt(toManYen(selected.comprehensive.incomeTax + selected.comprehensive.reconstructionTax))}万円</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">住民税</span>
              <span className="font-medium">{fmt(toManYen(selected.comprehensive.residentTax.total))}万円</span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-100">
              <span className="text-slate-500">年金分の手取り(1年あたり)</span>
              <span className="font-semibold">{fmt(toManYen(selected.pensionNetPerYear))}万円</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between py-2 border-t border-slate-300 mt-2">
          <span className="font-semibold text-slate-700">{selectedLabel}パターンの手取り総額({values.annuityYears}年間)</span>
          <span className="font-bold text-accent">{fmt(toManYen(selected.netAmount))}万円</span>
        </div>
      </div>

      <DetailsAccordion label="計算根拠を見る" className="mt-4">
        <p>
          本ツールは、所得税(累進課税)・復興特別所得税・住民税・公的年金等控除を中心に、現行の税制に基づいて計算しています。
          本体シミュレーターは長期にわたる資産推移を継続的に試算する都合上、税額を一律20.315%とする簡易モデルを採用していますが、
          本ツールは特定の受け取り方を比較検討するための単発計算のため、より精緻な計算を行っています。また、差分方式による
          経路依存性を避け、各受取方法(一時金・年金・併用)について、指定いただいた受給期間全体で受け取れる手取り総額を
          直接計算しています。
        </p>
        <p>ただし、以下は反映していません:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            国民健康保険料・後期高齢者医療保険料・介護保険料(特に年金・併用パターンでは、公的年金等に係る雑所得の増加に
            伴いこれらの保険料負担も増える場合があり、本ツールの試算はその分だけ有利に見える可能性があります)
          </li>
          <li>退職所得控除の重複調整(19年・9年ルール)</li>
          <li>基礎控除以外の各種所得控除</li>
          <li>年金受取中の運用</li>
          <li>税制年度ごとの基礎控除差</li>
          <li>比較期間中に65歳をまたぐ場合の区分切り替え</li>
        </ul>
        <p>
          退職後も給与・事業所得等がある方は「年金以外の所得」欄への入力を推奨します。実際の受取可否・税額は金融機関・
          企業年金規約・税務署にご確認ください。
        </p>
        <p className="pt-2 border-t border-slate-100">
          本ツールは、受給期間中の物価上昇(インフレ)を考慮せず、入力いただいた年金額やその他所得等を、期間を通じて
          毎年同額の名目値として計算しています。実際の受取額は物価変動により変わる可能性があります。
        </p>
      </DetailsAccordion>
    </div>
  );
}
