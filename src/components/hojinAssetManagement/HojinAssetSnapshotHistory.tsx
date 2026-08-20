'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';

interface HojinAssetSnapshotHistoryProps {
  snapshots: HojinAssetSnapshot[];
  onRecord: () => void;
  displayScope: 'hojin' | 'combined';
}

const INITIAL_HISTORY_COUNT = 5;

interface Point {
  date: string;
  amount: number;
}

// 個人資産管理ツールのAssetSnapshotHistory.tsx（ロック対象）を複製し、6.3節のトグルに
// 追従して法人のみ／合算の総資産額を折れ線グラフ・履歴一覧に反映するように拡張。
export default function HojinAssetSnapshotHistory({ snapshots, onRecord, displayScope }: HojinAssetSnapshotHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  const ascending: Point[] = [...snapshots]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((s) => ({
      date: s.date,
      amount: displayScope === 'combined' ? s.totalHojinAmount + s.totalPersonalAmount : s.totalHojinAmount,
    }));
  const descending = [...ascending].reverse();
  const visibleRows = expanded ? descending : descending.slice(0, INITIAL_HISTORY_COUNT);
  const hasMore = descending.length > INITIAL_HISTORY_COUNT;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">資産推移</h2>
        <button
          onClick={onRecord}
          className="text-xs font-semibold bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          記録する
        </button>
      </div>

      {ascending.length >= 2 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ascending} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}万円`, '資産合計額']} />
            <Line type="monotone" dataKey="amount" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
      {ascending.length === 1 && (
        <p className="text-xs text-slate-400 py-4 text-center">記録を重ねると推移がグラフで確認できます</p>
      )}

      {descending.length === 0 ? (
        <p className="text-xs text-slate-400 mt-3">記録履歴はまだありません。「記録する」を押すと、今の保有資産が記録されます。</p>
      ) : (
        <>
          <table className="w-full text-xs mt-3">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left font-normal">記録日</th>
                <th className="text-right font-normal">資産合計額</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((p) => (
                <tr key={p.date} className="border-t border-slate-200">
                  <td className="py-1">{p.date}</td>
                  <td className="py-1 text-right">{p.amount.toLocaleString()}万円</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
            >
              {expanded ? '閉じる ▲' : `すべて表示（${descending.length}件） ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
