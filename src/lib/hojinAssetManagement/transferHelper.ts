// 資産移転ヘルパー（法人→個人）の計算ロジック本体。HojinTransferHelper.tsxから分離し、
// scripts/verify-*.jsから直接importして回帰テストできるようにする
// （instruction_transfer_helper_tax_rate_fix.md 4節：計算式の向きが変わることへの回帰テスト）。

export type TransferMode = 'withdrawal' | 'salary';

/**
 * 個人側受取額を計算する。「適用税率」は文言通り「移転額のうち税金として差し引かれる割合」
 * として扱う：個人側受取額 = 移転額 ×（1 − 適用税率）。
 * salaryモード（役員報酬・給与）は税率を適用せず全額をそのまま個人側へ計上する
 * （HojinTransferHelper.tsxの既存仕様のまま）。
 */
export function calcPersonalDelta(mode: TransferMode, amount: number, ratePercent: number): number {
  if (mode !== 'withdrawal') return amount;
  return (amount * (100 - ratePercent)) / 100;
}
