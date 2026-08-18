import type { AssetSnapshot } from './types';

/** Dateを'YYYY-MM'形式に変換する（ブラウザのローカル時刻の年月のみ使用、タイムゾーン考慮なし） */
export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 「今月まだ記録していない」を検知する。直近スナップショットのdate（'YYYY-MM'）と
 * 当月の'YYYY-MM'文字列を単純な文字列比較で判定する（複雑な日付計算は不要な設計、
 * docs/fixes/active/2026-08-17_lifecompass-asset-management-investigation-2.md 3節参照）。
 */
export function isCurrentMonthRecorded(snapshots: AssetSnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  const latest = snapshots[snapshots.length - 1];
  return latest.date === toYearMonth(new Date());
}
