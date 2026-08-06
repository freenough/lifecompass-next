import { calcFutureValue } from '@/lib/financeCore';
import ToolCard from '@/components/tools/ui/ToolCard';

const RATES = [3, 5, 7];

interface CompoundInterestSensitivityTableProps {
  currentAssets: number;
  monthlyContribution: number;
  years: number;
  ratePct: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString('ja-JP');
}

export default function CompoundInterestSensitivityTable({
  currentAssets, monthlyContribution, years, ratePct,
}: CompoundInterestSensitivityTableProps) {
  // 入力利回りが3/5/7%のいずれとも一致しない場合は4行目として追加する（第1弾と同一パターン）
  const rates = RATES.includes(ratePct) ? RATES : [...RATES, ratePct].sort((a, b) => a - b);

  return (
    <ToolCard variant="table">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">利回り別の将来評価額</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="px-4 py-2 text-left font-medium">想定利回り</th>
            <th className="px-4 py-2 text-right font-medium">{years}年後の資産</th>
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => {
            const isUserInput = rate === ratePct;
            const value = calcFutureValue(currentAssets, monthlyContribution, years, rate);
            return (
              <tr key={rate} className={`border-b border-slate-100 last:border-0 ${isUserInput ? 'bg-bg-sub' : ''}`}>
                <td className="px-4 py-2 text-slate-700">
                  年率{rate}%{isUserInput && <span className="ml-1 text-[11px] text-accent">(入力値)</span>}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${isUserInput ? 'text-accent' : 'text-slate-700'}`}>
                  {fmt(value)}万円
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ToolCard>
  );
}
