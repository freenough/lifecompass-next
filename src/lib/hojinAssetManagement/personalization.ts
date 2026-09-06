// 「適用税率」スライダー（旧・個人化想定比率）の計算ロジック本体。
// PersonalizationRatioSlider.tsxから分離し、scripts/verify-*.jsから直接importして
// 回帰テストできるようにする（instruction_remove_transfer_helper_and_update_personalization_ratio.md
// 0.4節：「個人＋法人（個人化後）」合計行の追加に対する回帰テスト）。

/** 法人保有資産合計×比率＝個人化想定額（表示専用、simulate.tsには一切連携しない）。 */
export function calcPersonalizedAmount(hojinTotal: number, ratioPercent: number): number {
  return Math.round(hojinTotal * (ratioPercent / 100));
}

/** 個人資産＋個人化想定額（＝法人資産のうち将来個人化されると見積もった分）の合計。 */
export function calcCombinedTotal(personalTotal: number, hojinTotal: number, ratioPercent: number): number {
  return personalTotal + calcPersonalizedAmount(hojinTotal, ratioPercent);
}
