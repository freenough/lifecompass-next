import { calcAchievementAge } from '@/lib/financeCore';

const RATES = [3, 5, 7];

interface FireAgeSensitivityTableProps {
  curAge: number;
  currentAssets: number;
  targetAssets: number;
  monthlyContribution: number;
}

export default function FireAgeSensitivityTable({
  curAge, currentAssets, targetAssets, monthlyContribution,
}: FireAgeSensitivityTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">利回り別の到達年齢</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="px-4 py-2 text-left font-medium">想定利回り</th>
            <th className="px-4 py-2 text-right font-medium">到達年齢</th>
            <th className="px-4 py-2 text-right font-medium">あと何年</th>
          </tr>
        </thead>
        <tbody>
          {RATES.map(rate => {
            // メイン結果と同一の丸め方針（四捨五入ではなくfloor）
            const result = calcAchievementAge(curAge, currentAssets, targetAssets, monthlyContribution, rate);
            let ageDisplay = '—';
            let yearsDisplay = '—';
            if (result === 0) {
              ageDisplay = '到達済み';
            } else if (result !== null) {
              const achievedAge = Math.floor(result);
              ageDisplay = `${achievedAge}歳`;
              yearsDisplay = `${achievedAge - curAge}年`;
            }
            return (
              <tr key={rate}>
                <td className="px-4 py-2 text-slate-700">年率{rate}%</td>
                <td className="px-4 py-2 text-right font-semibold text-slate-700">{ageDisplay}</td>
                <td className="px-4 py-2 text-right text-slate-500">{yearsDisplay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
