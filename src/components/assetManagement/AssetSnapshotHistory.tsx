'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AssetSnapshot } from '@/lib/assetManagement/types';

interface AssetSnapshotHistoryProps {
  snapshots: AssetSnapshot[];
  onRecord: () => void;
}

// 2章：記録件数が増えるほどテーブルが伸び続けるのを防ぐため、初期表示は直近5件のみ。
// 折れ線グラフは常時全件表示のまま（2.1節、変更なし）。
const INITIAL_HISTORY_COUNT = 5;

// MonthlyRecordBanner（今月未記録のときだけ表示される呼びかけ）とは別に、常時表示の
// 記録ボタン＋折れ線グラフ＋履歴一覧をここに置く（1章：記録ボタン・履歴表示がどこからも
// 呼び出せなくなっていた不具合の修正、3章：総資産推移の折れ線グラフ追加）。
// Rechartsを使うため、呼び出し元（AssetManagementPage.tsx）でnext/dynamic + { ssr: false }
// による動的importにすること（既存の円グラフ・HeroDemo.tsxと同じパターン）。
export default function AssetSnapshotHistory({ snapshots, onRecord }: AssetSnapshotHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const ascending = [...snapshots].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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

      {/* 3.1節：2件未満は折れ線が意味を持たないため、代わりにメッセージを表示する。
          折れ線グラフ自体は常に全件（ascending）を描画し、件数によって省略しない。 */}
      {ascending.length >= 2 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={ascending} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v: number) => v.toLocaleString()} />
            <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}万円`, '資産合計額']} />
            <Line type="monotone" dataKey="totalAmount" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
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
              {visibleRows.map((s) => (
                <tr key={s.date} className="border-t border-slate-200">
                  <td className="py-1">{s.date}</td>
                  <td className="py-1 text-right">{s.totalAmount.toLocaleString()}万円</td>
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
