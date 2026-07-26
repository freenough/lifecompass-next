/**
 * 積立額逆算ツール向けの計算エンジン。
 * simulate.ts本体には一切依存しない独立した純粋関数群（環境非依存・ESM）。
 * 積立期の複利計算（口座残高の複利成長＋年末積立加算）が表す漸化式は、数学的に
 * 年金終価(ordinary annuity)の閉じた式と一致するため、ここではその閉じた式で
 * 目標資産・現在資産・年数・利回りから毎月積立額を代数的に解く（ループを伴わない）。
 * simulate.tsとの数値的整合性は scripts/verify-finance-core.js で継続的に確認する
 * （コードを共有するのではなく、数値を突き合わせて検証する方針）。
 */

/**
 * 目標資産に到達するために必要な毎月積立額を計算する。
 * 年金終価(ordinary annuity)の閉じた式に基づく。
 *
 * @param currentAssets 現在の資産額（万円）
 * @param targetAssets  目標資産額（万円）
 * @param years         積立期間（年）。呼び出し側で「目標達成年齢 − 現在の年齢」を渡す
 *                       （本関数自体は年齢を扱わない）
 * @param annualRatePct 想定利回り（年率%、例: 5 は年率5%）
 * @returns 必要な毎月積立額（万円/月）。`years`が0以下など計算そのものが成立しない
 *          場合は`null`を返す。`currentAssets >= targetAssets`（既に目標達成済み）
 *          の場合は「積立不要」という正常値として`0`を返す。
 */
export function calcRequiredMonthlyContribution(
  currentAssets: number,
  targetAssets: number,
  years: number,
  annualRatePct: number
): number | null {
  if (!(years > 0)) return null;
  if (currentAssets >= targetAssets) return 0;

  const r = annualRatePct / 100;
  const n = years;

  // 利回り0%（またはそれに近い）場合はゼロ除算になるため、単純な線形計算にフォールバックする。
  if (Math.abs(r) < 1e-9) {
    const annualContribution = (targetAssets - currentAssets) / n;
    return annualContribution / 12;
  }

  const growthFactor = Math.pow(1 + r, n);
  const annualContribution =
    ((targetAssets - currentAssets * growthFactor) * r) / (growthFactor - 1);

  return annualContribution / 12;
}

/**
 * 目標資産額への到達年齢を計算する（年金終価の閉じた式を逆向きに解く）。
 * calcRequiredMonthlyContribution() の逆算にあたる関数。
 *
 * 前提: 利回り年率固定・年1回複利（年末）・積立は年末一括・積立額一定。
 *
 * @param currentAge 現在の年齢
 * @param currentAssets 現在の資産額（万円）
 * @param targetAssets 目標資産額（万円）
 * @param monthlyContribution 毎月の積立額（万円/月）
 * @param annualRatePct 想定利回り（年率%、例: 5 は年率5%）。
 *                        calcRequiredMonthlyContribution()と単位を揃えている
 *                        （関数内部で/100してから使う。指示書の疑似コードは
 *                        annualRateとして小数(0.05等)を直接ln(1+annualRate)に
 *                        使っていたが、それだと同じ数値をcalcRequiredMonthlyContribution
 *                        （年率%を受け取る）と往復させる呼び出し側で単位が食い違い、
 *                        往復整合性が壊れるため、この関数も年率%を受け取り内部で
 *                        小数に変換する設計にした）。
 * @returns 到達年齢(小数)。null=到達不可能。0=既に到達済み。
 *          UI側で整数化する際は四捨五入ではなく切り捨て(floor)を使うこと
 *          （年末積立モデルとの整合性、法務的な保守性のため）。
 */
export function calcAchievementAge(
  currentAge: number,
  currentAssets: number,
  targetAssets: number,
  monthlyContribution: number,
  annualRatePct: number
): number | null {
  if (currentAssets >= targetAssets) return 0;

  const r = annualRatePct / 100;
  const annualContribution = monthlyContribution * 12;

  if (Math.abs(r) < 1e-9) {
    if (annualContribution <= 0) return null;
    const years = (targetAssets - currentAssets) / annualContribution;
    return currentAge + years;
  }

  const perpetuity = annualContribution / r;
  const x = (targetAssets + perpetuity) / (currentAssets + perpetuity);

  if (!isFinite(x) || x <= 0) return null;
  if (1 + r <= 0) return null;

  const years = Math.log(x) / Math.log(1 + r);
  if (!isFinite(years) || years < 0) return null;

  return currentAge + years;
}
