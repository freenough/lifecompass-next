import { calcPrepaySavings, type PrepayType } from '@/lib/mortgagePrepayCore';
import { calcMortgage } from '@/lib/helpers';
import { calcFutureValue } from '@/lib/financeCore';
import ToolCard from '@/components/tools/ui/ToolCard';

interface PrepayVsInvestComparisonTableProps {
  balance: number;
  rate: number;
  remainingYears: number;
  prepayAmount: number;
  prepayType: PrepayType;
  investRate: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ja-JP');
}

export default function PrepayVsInvestComparisonTable({
  balance, rate, remainingYears, prepayAmount, prepayType, investRate,
}: PrepayVsInvestComparisonTableProps) {
  const savings = calcPrepaySavings(balance, rate, remainingYears, prepayAmount, prepayType);
  const futureValue = calcFutureValue(prepayAmount, 0, remainingYears, investRate);

  const impactText = savings.noSolution
    ? '効果を計算できません'
    : prepayType === 'shorten'
      ? `完済まで約${Math.max(0, Math.round(remainingYears - (savings.newTermYears ?? remainingYears)))}年短縮（残存期間: ${remainingYears}年 → 約${(savings.newTermYears ?? remainingYears).toFixed(1)}年）`
      : `年間返済額が${fmt(calcMortgage(balance, rate, remainingYears))}万円 → ${fmt(savings.newPayment ?? 0)}万円に軽減`;

  const rows: { label: string; prepay: string; invest: string }[] = [
    {
      label: '確実な効果',
      prepay: savings.noSolution ? '—' : `${fmt(savings.interestSaved)}万円の利息削減`,
      invest: 'なし（市場次第）',
    },
    {
      label: '期待値',
      prepay: savings.noSolution ? '—' : `${fmt(savings.interestSaved)}万円（確定）`,
      invest: `${fmt(futureValue)}万円（年率${investRate}%で複利試算）`,
    },
    {
      label: 'リスク',
      prepay: 'なし',
      invest: 'あり（元本割れの可能性があります）',
    },
    {
      label: '流動性',
      prepay: '低い（一度支払うと戻せません）',
      invest: '高い（いつでも引き出し可能）',
    },
    {
      label: '完済年齢・期間への影響',
      prepay: impactText,
      invest: '影響なし',
    },
  ];

  return (
    <ToolCard variant="table">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">繰上返済 vs 投資の比較</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          {/* 2列(繰上返済/投資)は中立に統一：色で優劣を示さず、背景の統一+縦の区切り線という
              構造的な装置のみで区別する（accent色=選択状態・推奨という既存の意味連想を、
              「勝敗判定ではない比較」であるこの表に持ち込まないため）。 */}
          <tr className="bg-slate-100 text-xs text-slate-500">
            <th className="px-4 py-2 text-left font-medium"></th>
            <th className="px-4 py-2 text-left font-medium border-l border-border">繰上返済</th>
            <th className="px-4 py-2 text-left font-medium border-l border-border">投資</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 text-slate-500 align-top whitespace-nowrap">{row.label}</td>
              <td className="px-4 py-3 text-slate-700 align-top border-l border-border">{row.prepay}</td>
              <td className="px-4 py-3 text-slate-700 align-top border-l border-border">{row.invest}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-4 pb-4 pt-3 text-xs text-slate-500 leading-relaxed border-t border-slate-100 mt-1">
        どちらが適しているかは、金利・リスク許容度・投資期間によって異なります。
      </p>
    </ToolCard>
  );
}
