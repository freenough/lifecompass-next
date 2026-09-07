import type { ReactNode } from 'react';

export interface LpKpiCardProps {
  label: string;
  value: ReactNode;
  variant?: 'good' | 'warn' | 'danger' | 'neutral';
}

/**
 * KpiCard.tsx（シミュレーター本体・資産管理画面と共有）のLP専用複製。
 * LP再設計Phase1（instruction_lp_typography_and_hero.md）で数値部分にSpace Groteskを
 * 適用するにはvalueをReactNode化する必要があったが、KpiCard.tsx自体は他画面と共有のため
 * 直接改変せず、新規コンポーネントとして分離した（呼び出し元はHeroDemo.tsxのみ）。
 * 見た目はKpiCard(size="sm")と同一。
 */
export default function LpKpiCard({ label, value, variant = 'neutral' }: LpKpiCardProps) {
  const bg: Record<string, string> = {
    good:    'bg-green-50 border-green-200',
    warn:    'bg-yellow-50 border-yellow-200',
    danger:  'bg-red-50 border-red-200',
    neutral: 'bg-slate-50 border-slate-200',
  };
  const text: Record<string, string> = {
    good:    'text-green-700',
    warn:    'text-yellow-700',
    danger:  'text-red-700',
    neutral: 'text-slate-700',
  };
  return (
    <div className={`h-full rounded-xl border p-3 sm:p-4 relative ${bg[variant]}`}>
      <p className="text-xs font-medium text-slate-500 mb-1 truncate">{label}</p>
      <p className={`text-sm font-bold leading-tight [text-wrap:balance] ${text[variant]}`}>{value}</p>
    </div>
  );
}
