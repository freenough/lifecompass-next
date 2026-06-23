'use client';

import { useState } from 'react';
import type { YearSnap } from '@/lib/types';

interface YearlyTableProps {
  snaps: YearSnap[];
  retAge: number;
  penAge: number;
  idecoStartAge: number;
  strategy?: string;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString();
}

// 旧HTML getIdecoDisplayBalance() と同等
// iDeCo受取年は受取前残高を表示（受取後は0になるため）
function idecoDisplay(s: YearSnap): number {
  return s.idecoBalanceBeforeWithdrawal ?? s.ideco;
}

function downloadCSV(snaps: YearSnap[], showFill: boolean) {
  const fillHeaders = showFill ? ['補填現金(比例)', '補填NISA(比例)'] : [];
  const headers = ['年齢', '総資産', 'NISA', 'iDeCo', '特定口座', '現金', '収入', '支出', 'CF', ...fillHeaders];
  const rows = snaps.map(s => {
    const base = [
      s.age,
      Math.round(s.totalAssets),
      Math.round(s.nisa),
      Math.round(idecoDisplay(s)),
      Math.round(s.tax),
      Math.round(s.cash),
      Math.round(s.income + (s.severanceNet ?? 0)),
      Math.round(s.expense),
      Math.round(s.cashFlow),
    ];
    if (showFill) base.push(s.fillCash || 0, s.fillNisa || 0);
    return base;
  });
  const bom = '﻿';
  const csv = bom + [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asset_simulation_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function YearlyTable({ snaps, retAge, penAge, idecoStartAge, strategy }: YearlyTableProps) {
  const [open, setOpen] = useState(false);
  const showFill = strategy === 'proportional';

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          年次資産テーブル
        </button>
        <button
          onClick={() => downloadCSV(snaps, showFill)}
          disabled={!snaps.length}
          className="text-xs border border-slate-300 rounded px-2.5 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40 shrink-0"
        >
          CSV
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          className="px-4 py-3 text-slate-400 hover:bg-slate-50 transition-colors shrink-0"
        >
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-t border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  '年齢', '総資産', 'NISA', 'iDeCo', '特定', '現金', '収入', '支出', 'CF',
                  ...(showFill ? ['補填現金', '補填NISA'] : []),
                ].map(h => (
                  <th key={h} className="px-2 py-2 text-right text-slate-500 font-medium first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snaps.map(s => {
                const isRetYear   = s.age === retAge;
                const isPenYear   = s.age === penAge;
                const isIdecoYear = s.age === idecoStartAge;
                const hasInc      = s.extraInc > 0;
                const hasExp      = s.extraExp > 0;

                const highlight = isRetYear ? 'bg-yellow-50' : isPenYear ? 'bg-blue-50' : isIdecoYear ? 'bg-green-50' : hasInc ? 'bg-emerald-50' : hasExp ? 'bg-orange-50' : '';

                const label = isRetYear
                  ? (s.idecoTaxPaid > 0 ? '退職 ▲iDeCo課税' : '退職')
                  : isPenYear  ? '年金'
                  : isIdecoYear ? 'iDeCo'
                  : hasInc ? '収入+'
                  : hasExp ? '支出+'
                  : '';

                return (
                  <tr key={s.age} className={`border-t border-slate-100 ${highlight}`}>
                    <td className="px-2 py-1 font-medium text-slate-700">
                      {s.age}歳
                      {label && <span className={`ml-1 text-[10px] ${isRetYear ? 'text-yellow-600' : isPenYear ? 'text-blue-600' : isIdecoYear ? 'text-green-600' : hasInc ? 'text-emerald-600' : 'text-orange-600'}`}>{label}</span>}
                    </td>
                    <td className="px-2 py-1 text-right">{fmt(s.totalAssets)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.nisa)}</td>
                    <td className="px-2 py-1 text-right">{fmt(idecoDisplay(s))}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.tax)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.cash)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.income + (s.severanceNet ?? 0))}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.expense)}</td>
                    <td className={`px-2 py-1 text-right ${s.cashFlow < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {s.cashFlow >= 0 ? '+' : ''}{fmt(s.cashFlow)}
                    </td>
                    {showFill && (
                      <>
                        <td className={`px-2 py-1 text-right ${s.fillCash > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {s.fillCash > 0 ? fmt(s.fillCash) : '-'}
                        </td>
                        <td className={`px-2 py-1 text-right ${s.fillNisa > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {s.fillNisa > 0 ? fmt(s.fillNisa) : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
