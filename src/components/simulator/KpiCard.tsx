'use client';

import { useState } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'good' | 'warn' | 'danger' | 'neutral';
  footer?: React.ReactNode;
  tooltip?: string;
  wrapperClassName?: string;
  /**
   * 'sm'指定時、値のフォントサイズをtext-xl(20px)からtext-sm(14px)に縮小する。
   * LPヒーローの3列ミニカード（375px幅で「枯渇なし」等4文字の値が折り返さず収まる
   * 最小サイズを実測して決定。20px時は自然幅80pxに対しカード内の実利用可能幅は61pxで
   * 収まらず、14pxなら56pxで5pxの余裕を確保できる。15pxでは60pxとなり1pxしか余裕が
   * なくブラウザ間のサブピクセル差で再び折り返すリスクがあるため見送った）。
   * 未指定時は従来通り'default'（シミュレーター本体のKpiGridは常にこちら、変更なし）。
   */
  size?: 'default' | 'sm';
}

/** シミュレーター画面のKPIカードと同一の白背景+状態色(緑/黄/赤/中立)デザイン。LPのライブデモでも再利用する。 */
export default function KpiCard({ label, value, sub, variant = 'neutral', footer, tooltip, wrapperClassName, size = 'default' }: KpiCardProps) {
  const [showTip, setShowTip] = useState(false);

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
    <div className={`h-full rounded-xl border p-3 sm:p-4 relative ${bg[variant]} ${wrapperClassName ?? ''}`}>
      {tooltip && (
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setShowTip(v => !v)}
            className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-slate-300"
            aria-label="説明を表示"
          >
            ?
          </button>
          {showTip && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTip(false)} />
              <div className="absolute right-0 top-6 z-20 w-52 rounded-lg bg-slate-800 text-white text-xs p-3 shadow-xl leading-relaxed">
                <div className="absolute -top-1.5 right-1 w-3 h-3 bg-slate-800 rotate-45" />
                {tooltip}
              </div>
            </>
          )}
        </div>
      )}
      <p className="text-xs font-medium text-slate-500 mb-1 truncate">{label}</p>
      <p className={`${size === 'sm' ? 'text-sm' : 'text-xl'} font-bold leading-tight ${text[variant]}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 leading-tight">{sub}</p>}
      {footer}
    </div>
  );
}
