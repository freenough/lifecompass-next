import { calcPrepaySavings, type PrepayType } from '@/lib/mortgagePrepayCore';
import { calcFutureValue } from '@/lib/financeCore';
import ToolCard from '@/components/tools/ui/ToolCard';

interface PrepayVsInvestResultProps {
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

export default function PrepayVsInvestResult({
  balance, rate, remainingYears, prepayAmount, prepayType, investRate,
}: PrepayVsInvestResultProps) {
  const savings = calcPrepaySavings(balance, rate, remainingYears, prepayAmount, prepayType);
  const futureValue = calcFutureValue(prepayAmount, 0, remainingYears, investRate);
  const investGain = futureValue - prepayAmount;

  return (
    <ToolCard variant="result">
      <div className="rounded-lg border border-accent bg-blue-50 p-4">
        <p className="text-sm font-medium text-slate-500">繰上返済{prepayAmount.toLocaleString('ja-JP')}万円による利息削減額（確実な効果）</p>
        {savings.noSolution ? (
          <p className="mt-1 text-lg font-semibold text-slate-700">
            この条件では期間短縮の効果がありません。返済額軽減型への切り替え、または比較する金額の見直しをご検討ください。
          </p>
        ) : (
          <p className="mt-1 text-4xl sm:text-5xl font-bold text-slate-800 leading-none [text-wrap:balance]">
            {fmt(savings.interestSaved)}
            <span className="ml-1 text-xl sm:text-2xl font-bold">万円</span>
          </p>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        同じ{prepayAmount.toLocaleString('ja-JP')}万円を年率{investRate}%で{remainingYears}年間運用した場合の期待評価額（NISA枠内・非課税前提）は
        <span className="font-semibold text-slate-800">{fmt(futureValue)}万円</span>（運用益{fmt(investGain)}万円）です。
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400 leading-relaxed">
        <p>繰上返済の利息削減額は、現在の金利・残年数が変わらないと仮定した確定計算です。投資の評価額は入力した利回りで単純に複利計算した期待値であり、実際の運用成績を保証するものではありません（元本割れの可能性があります）。</p>
        <p>投資はNISA枠内・非課税での運用を前提としています。課税口座での運用は考慮していません。</p>
        <p>単発の繰上返済のみを対象としています。継続的な毎月繰上返済、変動金利のブレ、借り換えは考慮していません。</p>
      </div>
    </ToolCard>
  );
}
