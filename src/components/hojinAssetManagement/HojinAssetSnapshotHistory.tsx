'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import { toYearMonth } from '@/lib/assetManagement/monthlyCheck';
import { findPersonalSnapshot, findHojinSnapshot, getMergedRecordDates } from '@/lib/hojinAssetManagement/personalHistory';

interface HojinAssetSnapshotHistoryProps {
  snapshots: HojinAssetSnapshot[];
  onRecord: () => void;
  displayScope: 'personalOnly' | 'combined';
  /** 現在の個人保有資産合計（ライブ値）。当月のグラフポイントに常に反映する（4章）。 */
  currentPersonalTotal: number;
  /** 現在の法人保有資産合計（ライブ値）。 */
  currentHojinTotal: number;
  /**
   * 個人ストア自身の真の記録履歴。過去月の個人側金額は、法人スナップショットが持つ
   * totalPersonalAmount（記録タイミングによって歯抜けになりうる表示用の複製）ではなく、
   * こちらを該当年月で優先参照する（simplify_csv_scope_and_fix_graph_history_bug.md 1章）。
   */
  personalSnapshots: AssetSnapshot[];
}

const INITIAL_HISTORY_COUNT = 5;

interface Point {
  date: string;
  amount: number;
}

// 個人資産管理ツールのAssetSnapshotHistory.tsx（ロック対象）を複製し、6.3節のトグルに
// 追従して法人のみ／合算の総資産額を折れ線グラフ・履歴一覧に反映するように拡張。
export default function HojinAssetSnapshotHistory({
  snapshots,
  onRecord,
  displayScope,
  currentPersonalTotal,
  currentHojinTotal,
  personalSnapshots,
}: HojinAssetSnapshotHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  const toPoint = (date: string, totalPersonalAmount: number, totalHojinAmount: number): Point => ({
    date,
    // フェーズ1：/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す。
    amount: displayScope === 'combined' ? totalPersonalAmount + totalHojinAmount : totalPersonalAmount,
  });

  // 1章：過去月の個人側金額は、個人ストア自身の真の記録履歴を該当年月で優先参照する
  // （無ければ法人スナップショットの表示用複製totalPersonalAmountへフォールバック）。
  const personalTotalForSnapshot = (s: HojinAssetSnapshot): number =>
    findPersonalSnapshot(personalSnapshots, s.date)?.totalAmount ?? s.totalPersonalAmount;

  // claude_instruction_fix_hojin_toggle_history_graph_bug.md：「行が存在するか」の判定を
  // 法人スナップショット配列単独ではなく、個人・法人の日付の和集合に変更する。ある年月の
  // 個人側金額はpersonalSnapshotsを優先し、無ければその年月の法人スナップショットが持つ
  // totalPersonalAmountへフォールバックする。法人側金額は、その年月に法人スナップショットが
  // 無ければ0円として扱う（個人単独の記録月は法人トグルの有無に関係なく行として存在する）。
  const toPointForDate = (date: string): Point => {
    const hojinSnap = findHojinSnapshot(snapshots, date);
    const personalAmount = findPersonalSnapshot(personalSnapshots, date)?.totalAmount
      ?? (hojinSnap ? personalTotalForSnapshot(hojinSnap) : 0);
    const hojinAmount = hojinSnap?.totalHojinAmount ?? 0;
    return toPoint(date, personalAmount, hojinAmount);
  };
  const recordDates = getMergedRecordDates(personalSnapshots, snapshots);

  // 4章：資産推移グラフの当月ポイントは「記録する」を押していなくても常にライブ値を表示する。
  // 過去月は引き続き記録済みスナップショットのまま。永続化はしない（表示専用の計算）。
  const nowYM = toYearMonth(new Date());
  const hasCurrentRecord = recordDates.includes(nowYM);
  const liveCurrentPoint = toPoint(nowYM, currentPersonalTotal, currentHojinTotal);
  const chartPoints: Point[] = recordDates.map((d) => (d === nowYM ? liveCurrentPoint : toPointForDate(d)));
  const ascending: Point[] = hasCurrentRecord ? chartPoints : [...chartPoints, liveCurrentPoint];

  const descending: Point[] = [...recordDates].reverse().map((d) => toPointForDate(d));
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
