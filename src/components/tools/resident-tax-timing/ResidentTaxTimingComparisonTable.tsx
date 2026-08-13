import { calcResidentTaxTiming } from '@/lib/tax/residentTaxTiming';
import ToolCard from '@/components/tools/ui/ToolCard';

const COMPARE_MONTHS = [3, 6, 9, 12];

interface ResidentTaxTimingComparisonTableProps {
  priorYearIncomeManYen: number;
  targetMonth: number;
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

function toManYen(yen: number): number {
  return Math.round(yen / 10_000);
}

/**
 * 3月・6月・9月・12月×同一の退職前年年収で比較する。前々年の年収・退職後給与収入・
 * 退職年の給与上書きは考慮せず、常に「代用/月割り自動算出」の基本ケースで揃える
 * (詳細設定を反映すると退職月ごとの条件が揃わなくなるため)。
 * 3月は前々年基準・9月は退職前年基準になり、所得基準年が異なることが列に表れる。
 */
export default function ResidentTaxTimingComparisonTable({
  priorYearIncomeManYen, targetMonth,
}: ResidentTaxTimingComparisonTableProps) {
  const months = COMPARE_MONTHS.includes(targetMonth)
    ? COMPARE_MONTHS
    : [...COMPARE_MONTHS, targetMonth].sort((a, b) => a - b);

  const priorYearIncome = priorYearIncomeManYen * 10_000;

  return (
    <ToolCard variant="table">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">退職月別の比較(退職前年年収{fmt(priorYearIncomeManYen)}万円)</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="px-4 py-2 text-left font-medium">退職月</th>
            <th className="px-4 py-2 text-left font-medium">所得基準</th>
            <th className="px-4 py-2 text-right font-medium">今の住民税の残り</th>
            <th className="px-4 py-2 text-right font-medium">②(新しい住民税)</th>
            <th className="px-4 py-2 text-right font-medium">合計</th>
          </tr>
        </thead>
        <tbody>
          {months.map(month => {
            const isSelected = month === targetMonth;
            const result = calcResidentTaxTiming({
              priorYearIncome,
              retirementMonth: month,
              postRetirementIncome: 0,
            });
            // 「合計」列は円単位のtotalCashNeededを独自に丸めるのではなく、
            // 個別に丸めた2列(今の住民税の残り・翌年6月〜)を足した値を表示する
            // (ResidentTaxTimingResult.tsxのヘッドラインと同じ丸め方式に統一)。
            const roundedCurrent = toManYen(result.currentYearTax.remainingAmount);
            const roundedNext = toManYen(result.nextYearTax.total);
            return (
              <tr key={month} className={`border-b border-slate-100 last:border-0 ${isSelected ? 'bg-bg-sub' : ''}`}>
                <td className="px-4 py-2 text-slate-700">
                  {month}月{isSelected && <span className="ml-1 text-[11px] text-accent">(選択中)</span>}
                </td>
                <td className="px-4 py-2 text-slate-500">{result.currentYearTax.incomeBasisYearLabel}</td>
                <td className={`px-4 py-2 text-right ${isSelected ? 'text-accent font-semibold' : 'text-slate-700'}`}>
                  {fmt(roundedCurrent)}万円
                </td>
                <td className={`px-4 py-2 text-right ${isSelected ? 'text-accent font-semibold' : 'text-slate-700'}`}>
                  {fmt(roundedNext)}万円
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${isSelected ? 'text-accent' : 'text-slate-700'}`}>
                  {fmt(roundedCurrent + roundedNext)}万円
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 pb-3 pt-2 text-[11px] text-slate-400">
        3月退職と9月退職では、住民税の計算のもとになる年が違うため、金額も変わります。
        また、②の課税開始時期も退職月によって異なります(1〜5月退職〈3月など〉:今年6月から/
        6〜12月退職〈6月・9月・12月〉:翌年6月から)。
        退職後給与収入は0円、前々年所得・退職年所得の詳細入力は考慮せず、基本条件のみで比較しています
        (独身・扶養家族なしを前提とした試算です)。
      </p>
    </ToolCard>
  );
}
