'use client';

import { useState } from 'react';
import type { YearSnap } from '@/lib/types';

interface YearlyTableProps {
  snaps: YearSnap[];
  retAge: number;
  penAge: number;
  idecoStartAge: number;
}

function fmt(v: number): string {
  return Math.round(v).toLocaleString();
}

function downloadCSV(snaps: YearSnap[]) {
  const headers = ['年齢', '総資産', 'NISA', 'iDeCo', '特定口座', '現金', '収入', '支出', 'CF'];
  const rows = snaps.map(s => [
    s.age,
    Math.round(s.totalAssets),
    Math.round(s.nisa),
    Math.round(s.ideco),
    Math.round(s.tax),
    Math.round(s.cash),
    Math.round(s.income + (s.severanceNet ?? 0)),
    Math.round(s.expense),
    Math.round(s.cashFlow),
  ]);
  const bom = '﻿';
  const csv = bom + [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `asset_simulation_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function YearlyTable({ snaps, retAge, penAge, idecoStartAge }: YearlyTableProps) {
  const [open, setOpen] = useState(false);

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
          onClick={() => downloadCSV(snaps)}
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
                {['年齢', '総資産', 'NISA', 'iDeCo', '特定', '現金', '収入', '支出', 'CF'].map(h => (
                  <th key={h} className="px-2 py-2 text-right text-slate-500 font-medium first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snaps.map(s => {
                const isRetYear   = s.age === retAge;
                const isPenYear   = s.age === penAge;
                const isIdecoYear = s.age === idecoStartAge;
                const highlight   = isRetYear ? 'bg-yellow-50' : isPenYear ? 'bg-blue-50' : isIdecoYear ? 'bg-green-50' : '';
                return (
                  <tr key={s.age} className={`border-t border-slate-100 ${highlight}`}>
                    <td className="px-2 py-1 font-medium text-slate-700">
                      {s.age}歳
                      {isRetYear   && <span className="ml-1 text-yellow-600 text-[10px]">退職</span>}
                      {isPenYear   && <span className="ml-1 text-blue-600 text-[10px]">年金</span>}
                      {isIdecoYear && <span className="ml-1 text-green-600 text-[10px]">iDeCo</span>}
                    </td>
                    <td className="px-2 py-1 text-right">{fmt(s.totalAssets)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.nisa)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.ideco)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.tax)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.cash)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.income)}</td>
                    <td className="px-2 py-1 text-right">{fmt(s.expense)}</td>
                    <td className={`px-2 py-1 text-right ${s.cashFlow < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {s.cashFlow >= 0 ? '+' : ''}{fmt(s.cashFlow)}
                    </td>
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
