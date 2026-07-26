import { calcRequiredMonthlyContribution } from '@/lib/financeCore';

const BASE_RATES = [3, 5, 7];

interface SensitivityTableProps {
  currentAssets: number;
  targetAssets: number;
  years: number;
  ratePct: number;
}

function fmtMonthly(v: number): string {
  return v.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
}

export default function SensitivityTable({ currentAssets, targetAssets, years, ratePct }: SensitivityTableProps) {
  // 入力利回りが3/5/7%のいずれとも一致しない場合は4行目として追加する
  const rates = BASE_RATES.includes(ratePct)
    ? BASE_RATES
    : [...BASE_RATES, ratePct].sort((a, b) => a - b);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">利回り別の必要積立額</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="px-4 py-2 text-left font-medium">想定利回り</th>
            <th className="px-4 py-2 text-right font-medium">必要な毎月積立額</th>
          </tr>
        </thead>
        <tbody>
          {rates.map(rate => {
            const isUserInput = rate === ratePct;
            const value = calcRequiredMonthlyContribution(currentAssets, targetAssets, years, rate);
            const display = value === null ? '—' : value === 0 ? '積立不要' : `${fmtMonthly(value)}万円`;
            return (
              <tr key={rate} className={isUserInput ? 'bg-bg-sub' : undefined}>
                <td className="px-4 py-2 text-slate-700">
                  年率{rate}%{isUserInput && <span className="ml-1 text-[11px] text-accent">(入力値)</span>}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${isUserInput ? 'text-accent' : 'text-slate-700'}`}>
                  {display}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
