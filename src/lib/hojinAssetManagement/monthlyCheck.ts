import type { HojinAssetSnapshot } from './types';

// 個人資産管理ツール（monthlyCheck.ts、ロック対象）と同じロジックを複製。

/** Dateを'YYYY-MM'形式に変換する（ブラウザのローカル時刻の年月のみ使用、タイムゾーン考慮なし） */
export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** 「今月まだ記録していない」を検知する。直近スナップショットのdateと当月を単純な文字列比較で判定する。 */
export function isCurrentMonthRecorded(snapshots: HojinAssetSnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  const latest = snapshots[snapshots.length - 1];
  return latest.date === toYearMonth(new Date());
}
