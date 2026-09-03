import type { AssetSnapshot } from './types';

/** Dateを'YYYY-MM'形式に変換する（ブラウザのローカル時刻の年月のみ使用、タイムゾーン考慮なし） */
export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 「今月まだ記録していない」を検知する。当月の'YYYY-MM'文字列と一致するレコードが
 * 配列内のどこかに存在するかを直接調べる（単純な文字列比較で判定する設計自体は変更なし、
 * docs/fixes/active/2026-08-17_lifecompass-asset-management-investigation-2.md 3節参照）。
 * claude_instruction_banner_and_duplicate_plan_fix.md：以前は`snapshots[snapshots.length-1]`
 * （配列の最後の要素＝日付的に最新という前提）で判定していたが、CSV/JSONインポート後や
 * addSnapshot()の追記後に配列が日付順とは限らないケースがあり、その前提が崩れると
 * バナーが誤った状態のままになっていた。every()/some()なら配列の並び順に一切依存しない。
 */
export function isCurrentMonthRecorded(snapshots: AssetSnapshot[]): boolean {
  if (snapshots.length === 0) return false;
  const currentYm = toYearMonth(new Date());
  return snapshots.some((s) => s.date === currentYm);
}
