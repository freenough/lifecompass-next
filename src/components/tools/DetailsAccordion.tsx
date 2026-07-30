'use client';

import { useState } from 'react';

interface DetailsAccordionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * ツール結果画面の「計算根拠を見る」等、折りたたみ式の詳細説明セクション。
 * 元はIdecoWithdrawalResult.tsx内にのみ実装されていたものを、教育費シミュレーター
 * 追加時に共通化した（implementation_education_cost_calc_basis.md 1章）。
 */
export default function DetailsAccordion({ label, children, className }: DetailsAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-lg border border-slate-200 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>{label}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 text-xs text-slate-500 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
