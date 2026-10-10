// 個人資産管理ツール（monthlyCheck.ts、ロック対象）と同じロジックを複製。
// toYearMonthのみ使用（storage.tsが参照）。月次記録判定（isCurrentMonthRecorded）は、法人版バナー削除に伴い削除した。

/** Dateを'YYYY-MM'形式に変換する（ブラウザのローカル時刻の年月のみ使用、タイムゾーン考慮なし） */
export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
