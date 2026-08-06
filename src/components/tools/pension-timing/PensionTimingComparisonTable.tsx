import { calcPensionAmountAtAge, calcCumulativeAmount } from '@/lib/pensionCore';
import ToolCard from '@/components/tools/ui/ToolCard';

const BASE_AGES = [60, 65, 75];

interface PensionTimingComparisonTableProps {
  basicAmount: number;
  employeesAmount: number;
  isNewRate: boolean;
  targetAge: number;
  compareEndAge: number;
}

function fmt(v: number): string {
  return v.toLocaleString('ja-JP');
}

export default function PensionTimingComparisonTable({
  basicAmount, employeesAmount, isNewRate, targetAge, compareEndAge,
}: PensionTimingComparisonTableProps) {
  // 60/65/75と重複しない場合のみ選択中の年齢を4行目として追加する（重複行は作らない）
  const ages = BASE_AGES.includes(targetAge)
    ? BASE_AGES
    : [...BASE_AGES, targetAge].sort((a, b) => a - b);

  return (
    <ToolCard variant="table">
      <p className="px-4 pt-4 text-xs font-medium text-slate-500">受給開始年齢別の比較</p>
      <table className="w-full mt-2 text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-400">
            <th className="px-4 py-2 text-left font-medium">受給開始</th>
            <th className="px-4 py-2 text-right font-medium">年額</th>
            <th className="px-4 py-2 text-right font-medium">{compareEndAge}歳までの累計</th>
          </tr>
        </thead>
        <tbody>
          {ages.map(age => {
            const isSelected = age === targetAge;
            const { totalAmount } = calcPensionAmountAtAge(basicAmount, employeesAmount, age, isNewRate);
            const cumulative = calcCumulativeAmount(basicAmount, employeesAmount, age, isNewRate, compareEndAge);
            return (
              <tr key={age} className={`border-b border-slate-100 last:border-0 ${isSelected ? 'bg-bg-sub' : ''}`}>
                <td className="px-4 py-2 text-slate-700">
                  {age}歳{isSelected && <span className="ml-1 text-[11px] text-accent">(選択中)</span>}
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${isSelected ? 'text-accent' : 'text-slate-700'}`}>
                  {fmt(totalAmount)}万円
                </td>
                <td className={`px-4 py-2 text-right ${isSelected ? 'text-accent font-semibold' : 'text-slate-500'}`}>
                  {fmt(cumulative)}万円
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ToolCard>
  );
}
