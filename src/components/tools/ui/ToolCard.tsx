/**
 * 全ツール共通のカードラッパー(デザインシステム第1弾)。
 * 見た目のみを担い、計算ロジックは一切持ち込まない。
 * variant="result": 結果カード系(角丸・パディング維持、枠線強化+shadow-sm)
 * variant="table":   テーブルラッパー系(パディングなし・overflow-hidden、枠線強化+shadow-sm)
 */
export type ToolCardVariant = 'result' | 'table';

interface ToolCardProps {
  variant: ToolCardVariant;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASS: Record<ToolCardVariant, string> = {
  result: 'p-5 sm:p-6',
  table: 'overflow-hidden',
};

export default function ToolCard({ variant, className = '', children }: ToolCardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-slate-300 bg-white shadow-sm',
        VARIANT_CLASS[variant],
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
