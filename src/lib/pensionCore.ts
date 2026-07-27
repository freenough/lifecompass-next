/**
 * 年金 繰上げ・繰下げ 比較シミュレーター向けの計算エンジン。
 * financeCore.ts（積立・複利計算）とは異なる計算領域（公的年金の増減率ルール）を扱うため、
 * 投資調査（investigation_pension_timing_tool.md）の結論に基づき別ファイルに分離した。
 * simulate.ts/analyze.tsには一切依存しない独立した純粋関数群。
 */

export const EARLY_RATE_NEW = -0.004; // 繰上げ・新率(1962/4/2以降生まれ)
export const EARLY_RATE_OLD = -0.005; // 繰上げ・旧率(1962/4/1以前生まれ)
export const LATE_RATE = 0.007;       // 繰下げ
export const REFERENCE_AGE = 65;      // 増減の基準年齢
export const MIN_AGE = 60;            // 繰上げ下限
export const MAX_AGE = 75;            // 繰下げ上限

export interface PensionAmountResult {
  totalAmount: number;
  basicAmount: number;
  employeesAmount: number;
  rate: number;
}

/**
 * 指定した受給開始年齢における老齢基礎年金・老齢厚生年金の増減後金額を算出する。
 *
 * @param basicAmount - 老齢基礎年金(65歳時点・年額、万円)
 * @param employeesAmount - 老齢厚生年金(65歳時点・年額、万円)
 * @param targetAge - 受給開始年齢(60〜75の整数を想定。呼び出し側UIがセレクトで
 *   範囲を保証するため、範囲外入力への防御的処理は本関数の責務外とする)
 * @param isNewRate - 繰上げ減額率に新率(-0.4%/月)を適用するか
 *   (1962年4月2日以降生まれかどうか。targetAge > 65 の場合は繰下げのため
 *   この引数は無視される)
 * @returns 増減後の年額内訳と適用倍率
 *
 * 境界値:
 * - targetAge === 65 の場合、rate = 1(増減なし)、basicAmount/employeesAmountを
 *   そのまま返す
 * - targetAge === 60(繰上げ上限)の場合、monthsDiff = -60、
 *   rate = 1 + (-60 * 減額率) (新率なら1-0.24=0.76倍、旧率なら1-0.30=0.70倍)
 * - targetAge === 75(繰下げ上限)の場合、monthsDiff = 120、rate = 1 + 120*0.007 = 1.84倍
 */
export function calcPensionAmountAtAge(
  basicAmount: number,
  employeesAmount: number,
  targetAge: number,
  isNewRate: boolean
): PensionAmountResult {
  const monthsDiff = (targetAge - REFERENCE_AGE) * 12;

  let monthlyRate: number;
  if (targetAge === REFERENCE_AGE) {
    monthlyRate = 0;
  } else if (targetAge < REFERENCE_AGE) {
    monthlyRate = isNewRate ? EARLY_RATE_NEW : EARLY_RATE_OLD;
  } else {
    monthlyRate = LATE_RATE;
  }

  // 指示書の疑似コードは `rate = 1 + monthsDiff * monthlyRate` だったが、これをそのまま
  // 実装すると繰上げ側で符号が二重に効いてしまい、指示書自身が明記する期待値
  // (targetAge=60・新率で0.76倍)と矛盾する（monthsDiff=-60・EARLY_RATE_NEW=-0.004の積は
  // +0.24になり、1.24倍という誤った増額になってしまう）。EARLY_RATE_NEW/EARLY_RATE_OLDの
  // 符号（マイナス＝減額）だけで方向を表し、monthsDiffは「基準からの月数」という大きさとして
  // 絶対値で扱うのが正しい（LATE_RATE側はmonthsDiffが元々正なのでabs()の有無で結果は変わらず、
  // 指示書の繰下げ側の期待値(1.84倍)とは一致していた）。実際の年金制度の公表値
  // （60歳受給で24%減/30%減、70歳受給で+42%、75歳受給で+84%）とも一致することを確認済み。
  const rate = 1 + Math.abs(monthsDiff) * monthlyRate;

  const basicRounded = Math.round(basicAmount * rate);
  const employeesRounded = Math.round(employeesAmount * rate);

  return {
    totalAmount: basicRounded + employeesRounded,
    basicAmount: basicRounded,
    employeesAmount: employeesRounded,
    rate,
  };
}

export interface BreakEvenResult {
  age: number | null;
  foundWithinHorizon: boolean;
}

/**
 * 選択した受給開始年齢と65歳受給を比較し、累計受給額が逆転する年齢を算出する。
 *
 * @param basicAmount - 老齢基礎年金(65歳時点・年額、万円)
 * @param employeesAmount - 老齢厚生年金(65歳時点・年額、万円)
 * @param targetAge - 比較対象の受給開始年齢
 * @param isNewRate - 繰上げ減額率の新旧判定
 * @param compareEndAge - 比較終了年齢(寿命の想定。80/85/90/95/100を想定)
 * @returns 損益分岐年齢の算出結果
 *
 * 重要な仕様(spec 6.2節を参照。実装前レビューで明確化された箇所):
 * - targetAge === REFERENCE_AGE の場合、比較対象が同一のため
 *   { age: null, foundWithinHorizon: false } を返す
 *   (UI側はこの場合、損益分岐の表示自体を行わない設計とする)
 * - targetAge > REFERENCE_AGE(繰下げ)の場合、選択年齢の累計受給額が
 *   65歳受給の累計受給額を上回る(または一致する)最初の年齢を探す
 * - targetAge < REFERENCE_AGE(繰上げ)の場合、65歳受給の累計受給額が
 *   選択年齢の累計受給額を上回る(または一致する)最初の年齢を探す
 *   (早く受給開始した分、当初はリードするが後年65歳受給に逆転される)
 * - compareEndAge までに交点が見つからない場合は
 *   { age: null, foundWithinHorizon: false } を返す。これは「損益分岐が
 *   存在しない」ことを意味するのではなく「比較終了年齢の範囲内では
 *   逆転が起きない」ことを意味する。呼び出し側UIは、この場合
 *   「比較終了年齢(◯◯歳)内では、65歳受給との逆転は起こりません」と
 *   表示すること(「損益分岐なし」という表現は使わない)
 */
export function calcBreakEvenAge(
  basicAmount: number,
  employeesAmount: number,
  targetAge: number,
  isNewRate: boolean,
  compareEndAge: number
): BreakEvenResult {
  if (targetAge === REFERENCE_AGE) {
    return { age: null, foundWithinHorizon: false };
  }

  const referenceAnnual = calcPensionAmountAtAge(basicAmount, employeesAmount, REFERENCE_AGE, isNewRate).totalAmount;
  const targetAnnual = calcPensionAmountAtAge(basicAmount, employeesAmount, targetAge, isNewRate).totalAmount;

  let referenceCumulative = 0;
  let targetCumulative = 0;

  const startAge = Math.min(REFERENCE_AGE, targetAge);
  for (let age = startAge; age <= compareEndAge; age++) {
    if (age >= REFERENCE_AGE) referenceCumulative += referenceAnnual;
    if (age >= targetAge) targetCumulative += targetAnnual;

    if (targetAge > REFERENCE_AGE) {
      // 繰下げ: 選択年齢側が65歳受給側に追いつく（上回る）最初の年齢を探す
      if (targetCumulative >= referenceCumulative) {
        return { age, foundWithinHorizon: true };
      }
    } else {
      // 繰上げ: 65歳受給側が選択年齢側に追いつく（上回る）最初の年齢を探す
      if (referenceCumulative >= targetCumulative) {
        return { age, foundWithinHorizon: true };
      }
    }
  }

  return { age: null, foundWithinHorizon: false };
}

/**
 * 指定した受給開始年齢で受給した場合の、upToAge時点までの累計受給額を計算する。
 * calcBreakEvenAge()内部の累計加算ロジック（年額を毎年積み上げる）と同一の考え方を
 * 独立した関数として切り出したもの。フェーズ1のスコープ外だが、
 * PensionTimingComparisonTable.tsx（フェーズ2）の累計列表示のために追加した
 * （UI側での累計計算の再実装を避けるため、pensionCore.ts側に置く）。
 *
 * @param basicAmount - 老齢基礎年金(65歳時点・年額、万円)
 * @param employeesAmount - 老齢厚生年金(65歳時点・年額、万円)
 * @param targetAge - 受給開始年齢
 * @param isNewRate - 繰上げ減額率の新旧判定
 * @param upToAge - 累計を計算する対象年齢（この年齢の年末まで受給したとして計算）
 * @returns upToAge時点までの累計受給額（万円）。upToAge < targetAge の場合は
 *   まだ受給が始まっていないため0を返す。
 */
export function calcCumulativeAmount(
  basicAmount: number,
  employeesAmount: number,
  targetAge: number,
  isNewRate: boolean,
  upToAge: number
): number {
  if (upToAge < targetAge) return 0;

  const annual = calcPensionAmountAtAge(basicAmount, employeesAmount, targetAge, isNewRate).totalAmount;
  const years = upToAge - targetAge + 1;
  return annual * years;
}
