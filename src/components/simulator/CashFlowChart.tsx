'use client';

import { useState } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import type { YearSnap } from '@/lib/types';

interface CashFlowChartProps {
  snaps: YearSnap[];
}

function fmtYen(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${(v / 10000).toFixed(0)}億`;
  return `${v}万`;
}

export default function CashFlowChart({ snaps }: CashFlowChartProps) {
  const [open, setOpen] = useState(true);

  const data = snaps.map(s => ({ age: s.age, CF: s.cashFlow }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>年間キャッシュフロー</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="20%" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="age" tick={{ fontSize: 10 }} tickFormatter={v => `${v}歳`} interval="preserveStartEnd" />
              <YAxis width={48} tick={{ fontSize: 10 }} tickFormatter={fmtYen} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${Math.round(v as number).toLocaleString()}万円/年`, 'CF']}
                labelFormatter={l => `${l}歳`}
              />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="CF" radius={[2, 2, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.CF >= 0 ? '#1d9e75' : '#e24b4a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
