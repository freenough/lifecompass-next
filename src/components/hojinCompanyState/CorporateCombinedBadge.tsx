'use client';

// 「法人合算」補足バッジの共通コンポーネント（UI仕上げ指示書3章）。
// KpiGrid.tsx（最終資産カード・MC破綻確率カード）・MonteCarloPanel.tsx・ImpactTable.tsxの
// 4箇所で使い回す。それまでは各コンポーネントが独自にスタイルを持っていた
// （KpiGridは無色のテキスト、MonteCarloPanelは緑チップ）ため、見た目を統一する。

interface CorporateCombinedBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function CorporateCombinedBadge({ children, className = '' }: CorporateCombinedBadgeProps) {
  return (
    <p className={`text-[11px] text-emerald-700 bg-emerald-50 rounded px-2 py-1 ${className}`}>
      {children}
    </p>
  );
}
