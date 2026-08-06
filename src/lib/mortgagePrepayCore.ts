/**
 * 「繰上返済 vs 投資 比較」ツール向けの計算エンジン。
 * simulate.ts/analyze.tsには一切依存しない独立した純粋関数群（pensionCore.ts/financeCore.tsと同じ設計方針）。
 * 入力は「ローン残高＋残年数」（住宅ローンイベントの「元本＋経過年数」とは異なるモデル）を前提とする。
 */
import { calcMortgage, calcMortgageMonthly, calcMortgageTermFromPayment } from './helpers';

export type PrepayType = 'reduce' | 'shorten';

export interface PrepaySavingsResult {
  interestSaved: number;         // 繰上返済による利息削減額（万円）
  interestWithoutPrepay: number; // 繰上返済しなかった場合の総利息（万円）
  interestWithPrepay: number;    // 繰上返済した場合の総利息（万円）
  newPayment?: number;           // 返済額軽減型：新年間返済額（万円）。期間短縮型ではundefined
  newTermYears?: number;         // 期間短縮型：新残存期間（年、小数）。返済額軽減型ではundefined
  noSolution?: boolean;          // 期間短縮型で解なしの場合true（既存モーダルの「効果なし」と同じ扱い）
}

export function calcPrepaySavings(
  balance: number,
  rate: number,
  remainingYears: number,
  prepayAmount: number,
  prepayType: PrepayType
): PrepaySavingsResult {
  const currentPayment = calcMortgage(balance, rate, remainingYears);
  const interestWithoutPrepay = currentPayment * remainingYears - balance;
  const newPrincipal = Math.max(0, balance - prepayAmount);

  if (prepayType === 'reduce') {
    const newPayment = calcMortgage(newPrincipal, rate, remainingYears);
    const totalCostWithPrepay = prepayAmount + newPayment * remainingYears;
    const interestWithPrepay = totalCostWithPrepay - balance;
    return {
      interestSaved: interestWithoutPrepay - interestWithPrepay,
      interestWithoutPrepay,
      interestWithPrepay,
      newPayment,
    };
  }

  // 期間短縮型：月々返済額は現状のまま、残存期間を逆算する。
  const monthlyPayment = calcMortgageMonthly(balance, rate, remainingYears);
  const newTermYears = calcMortgageTermFromPayment(newPrincipal, rate, monthlyPayment);
  if (newTermYears == null) {
    return {
      interestSaved: 0,
      interestWithoutPrepay,
      interestWithPrepay: interestWithoutPrepay,
      noSolution: true,
    };
  }
  const totalCostWithPrepay = prepayAmount + currentPayment * newTermYears;
  const interestWithPrepay = totalCostWithPrepay - balance;
  return {
    interestSaved: interestWithoutPrepay - interestWithPrepay,
    interestWithoutPrepay,
    interestWithPrepay,
    newTermYears,
  };
}
