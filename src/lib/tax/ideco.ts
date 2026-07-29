/**
 * src/lib/tax/ideco.ts
 *
 * iDeCo/DC出口戦略シミュレーター(第6弾ツール)の税計算ロジック。
 * 参照: product_spec_ideco_exit_tool.md, IMPLEMENTATION_ideco_withdrawal_tool.md
 *
 * 公的年金等控除・総合課税(雑所得+その他所得)を国税庁の一次情報に準拠して計算する。
 * 退職所得(一時金部分)は src/lib/tax/retirement.ts の既存ロジックを薄いラッパー
 * (calcIdecoLumpSumTax)経由でそのまま再利用し、retirement.ts 本体は無変更。
 *
 * 金額は全て「円」単位で扱う(呼び出し側で万円→円の変換を行うこと)。
 */

import {
  calcRetirementDeduction,
  calcRetirementTaxableIncome,
  calcRetirementIncomeTax,
  calcProgressiveIncomeTax,
  calcResidentTax,
  type RetirementIncomeTaxResult,
} from "./retirement";

// ============================================================
// 公的年金等控除(国税庁No.1600速算表、令和2年分以後)
// v1スコープ:公的年金等に係る雑所得以外の所得金額が1,000万円以下のケースのみ対応。
// 1,000万円超のケースは非対応(Methodologyに明記する)。
// ============================================================

interface PensionDeductionBracket {
  upTo: number; // この金額未満(円)。Infinityは上限なし
  rate: number;
  addition: number; // 円
}

const PENSION_DEDUCTION_BRACKETS_65_PLUS: PensionDeductionBracket[] = [
  { upTo: 3_300_000, rate: 0, addition: 1_100_000 }, // 定額
  { upTo: 4_100_000, rate: 0.25, addition: 275_000 },
  { upTo: 7_700_000, rate: 0.15, addition: 685_000 },
  { upTo: 10_000_000, rate: 0.05, addition: 1_455_000 },
  { upTo: Infinity, rate: 0, addition: 1_955_000 }, // 定額
];

const PENSION_DEDUCTION_BRACKETS_UNDER_65: PensionDeductionBracket[] = [
  { upTo: 1_300_000, rate: 0, addition: 600_000 }, // 定額
  { upTo: 4_100_000, rate: 0.25, addition: 275_000 },
  { upTo: 7_700_000, rate: 0.15, addition: 685_000 },
  { upTo: 10_000_000, rate: 0.05, addition: 1_455_000 },
  { upTo: Infinity, rate: 0, addition: 1_955_000 }, // 定額
];

/**
 * 公的年金等控除額を計算する(65歳以上/未満の2区分、令和2年分以後の速算表)。
 *
 * @param pensionTotal 公的年金等の収入金額合計(円、iDeCo/DC年金分を含む)
 * @param age その年の年齢(受給開始年齢そのものではなく、判定対象年の年齢)
 * @returns 公的年金等控除額(円)
 */
export function calcPublicPensionDeduction(pensionTotal: number, age: number): number {
  const brackets = age >= 65 ? PENSION_DEDUCTION_BRACKETS_65_PLUS : PENSION_DEDUCTION_BRACKETS_UNDER_65;
  const bracket = brackets.find((b) => pensionTotal < b.upTo)!;
  if (bracket.rate === 0) return bracket.addition; // 定額区分
  return pensionTotal * bracket.rate + bracket.addition;
}

export interface PublicPensionTaxableIncomeResult {
  deduction: number;
  taxableIncome: number;
}

/**
 * 公的年金等(公的年金+iDeCo/DC年金)の雑所得金額を計算する。
 *
 * @param publicPensionAnnual 公的年金の年間受給額(円)
 * @param idecoAnnual iDeCo/DC年金の年間受給額(円、一時金パターンでは0)
 * @param age その年の年齢
 */
export function calcPublicPensionTaxableIncome(
  publicPensionAnnual: number,
  idecoAnnual: number,
  age: number
): PublicPensionTaxableIncomeResult {
  const total = publicPensionAnnual + idecoAnnual;
  const deduction = calcPublicPensionDeduction(total, age);
  const taxableIncome = Math.max(0, total - deduction);
  return { deduction, taxableIncome };
}

// ============================================================
// 総合課税(雑所得+その他所得)
// ============================================================

/**
 * 所得税の基礎控除額(合計所得金額に応じた変動制、令和7年度改正後)。
 * 2,350万円超の高所得者向け逓減規定はv1では非対応(2,350万円以下と同じ58万円を適用する。
 * Methodologyに明記する)。
 */
function calcIncomeTaxBasicDeduction(totalIncome: number): number {
  if (totalIncome <= 1_320_000) return 950_000;
  if (totalIncome <= 3_360_000) return 880_000;
  if (totalIncome <= 4_890_000) return 680_000;
  if (totalIncome <= 6_550_000) return 630_000;
  return 580_000; // 655万円超(2,350万円超の逓減は非対応)
}

/** 住民税の基礎控除額(原則43万円)。高所得者向けの逓減はv1では非対応(Methodologyに明記)。 */
const RESIDENT_TAX_BASIC_DEDUCTION = 430_000;

export interface ComprehensiveIncomeTaxResult {
  /** 総所得金額(雑所得+その他所得) */
  totalIncome: number;
  /** 所得税の基礎控除額 */
  basicDeduction: number;
  /** 所得税の課税所得金額(総所得金額-所得税の基礎控除、0円下限) */
  taxableIncomeAfterDeduction: number;
  /** 所得税(1円未満切り捨て、復興特別所得税を含まない) */
  incomeTax: number;
  /** 復興特別所得税(所得税×2.1%、1円未満切り捨て) */
  reconstructionTax: number;
  /** 住民税内訳(住民税の基礎控除43万円を用いた別計算) */
  residentTax: {
    municipal: number;
    prefectural: number;
    total: number;
  };
  /** 所得税+復興特別所得税+住民税 */
  totalTax: number;
}

/**
 * 雑所得(公的年金等・iDeCo/DC年金分、控除後)とその他所得(C案入力、「所得」ベース)を
 * 合算し、総合課税での税額を計算する。
 *
 * 計算順序(Product Spec 2-2確定):
 * 1. 総所得金額 = pensionTaxableIncome + otherIncome
 * 2. 所得税の基礎控除額を総所得金額に応じて決定
 * 3. 所得税の課税所得金額 = max(0, 総所得金額 - 所得税の基礎控除額)
 * 4. incomeTax = calcProgressiveIncomeTax(課税所得金額)(retirement.tsの共通関数を再利用)
 * 5. reconstructionTax = incomeTax × 2.1%(1円未満切り捨て)
 * 6. 住民税は所得税の基礎控除とは別の基礎控除額(原則43万円)を使う独立計算
 *    (令和7年度改正は所得税のみが対象で、住民税の基礎控除は改正対象外のため)
 * 7. totalTax = incomeTax + reconstructionTax + residentTax.total
 *
 * @param pensionTaxableIncome 公的年金等の雑所得金額(円、calcPublicPensionTaxableIncome()の戻り値)
 * @param otherIncome 年金以外の所得(円、C案入力。給与所得控除等を引いた後・人的控除を引く前の「所得」)
 */
export function calcComprehensiveIncomeTax(
  pensionTaxableIncome: number,
  otherIncome: number
): ComprehensiveIncomeTaxResult {
  // Step 1
  const totalIncome = pensionTaxableIncome + otherIncome;

  // Step 2-3: 所得税側
  const basicDeduction = calcIncomeTaxBasicDeduction(totalIncome);
  const taxableIncomeAfterDeduction = Math.max(0, totalIncome - basicDeduction);

  // Step 4-5: 所得税・復興特別所得税(所得税を先に1円未満切り捨てしてから、
  // その確定額に2.1%を掛けて復興特別所得税を別途算出する。退職所得側=calcRetirementIncomeTax()の
  // 「税率適用後に102.1%を掛けて1回だけ切り捨て」という丸め順序とは意図的に異なる
  // (総合課税は所得税額と復興特別所得税額をそれぞれ別の行として表示する必要があるため)。
  const rawIncomeTax = calcProgressiveIncomeTax(taxableIncomeAfterDeduction);
  const incomeTax = Math.max(0, Math.floor(rawIncomeTax + 1e-6));
  const reconstructionTax = Math.max(0, Math.floor(incomeTax * 0.021 + 1e-6));

  // Step 6: 住民税(所得税とは別の基礎控除43万円を使う)
  const residentTaxableIncome = Math.max(0, totalIncome - RESIDENT_TAX_BASIC_DEDUCTION);
  const residentTax = calcResidentTax(residentTaxableIncome);

  // Step 7
  const totalTax = incomeTax + reconstructionTax + residentTax.total;

  return {
    totalIncome,
    basicDeduction,
    taxableIncomeAfterDeduction,
    incomeTax,
    reconstructionTax,
    residentTax,
    totalTax,
  };
}

// ============================================================
// 退職所得(一時金部分)— retirement.ts への薄いラッパー
// ============================================================

/**
 * DC一時金(+会社の退職金)の退職所得税を計算する、retirement.ts への薄いラッパー。
 * retirement.ts 本体は無変更。「役員等」「障害者特例」は本ツールのUIで入力させない
 * 項目のため、常にfalseとして扱う(第5弾ツールのみが対応する詳細区分)。
 *
 * 勤続年数のmax()調整(退職所得控除の枠共有)は、iDeCo一時金と退職金が実際に
 * 同一年に同時受給される場合(idecoLump>0 かつ severance>0)にのみ適用する。
 * 片方のみの受給(年金パターンでidecoLump=0のケース等)でmax()を無条件適用すると、
 * 受け取っていない方の勤続年数が誤って混入し、控除額が不当に大きくなるバグになる。
 *
 * @param idecoLump DC一時金額(円、その年に受け取らない場合は0)
 * @param severance 会社の退職金額(円、その年に受け取らない場合は0)
 * @param idecoYrs iDeCo/DC加入年数
 * @param sevYrs 会社の勤続年数
 */
export function calcIdecoLumpSumTax(
  idecoLump: number,
  severance: number,
  idecoYrs: number,
  sevYrs: number
): RetirementIncomeTaxResult {
  const serviceYears =
    idecoLump > 0 && severance > 0 ? Math.max(idecoYrs, sevYrs) :
    idecoLump > 0 ? idecoYrs :
    severance > 0 ? sevYrs :
    0;
  const income = idecoLump + severance;
  return calcRetirementIncomeTax(income, serviceYears, false, false);
}

// re-export(呼び出し側でretirement.ts側の関数も併用したい場合のため)
export { calcRetirementDeduction, calcRetirementTaxableIncome };

// ============================================================
// 3パターン(一時金/年金/併用)比較 — 直接合算計算方式(差分方式は不採用)
// ============================================================

export interface IdecoWithdrawalInput {
  /** iDeCo/DC残高(円) */
  idecoBalance: number;
  /** iDeCo/DC加入年数 */
  idecoYrs: number;
  /** 受取開始年齢(60〜75、65歳以上/未満の公的年金等控除区分判定に使用) */
  receiveAge: number;
  /** 公的年金の年間受給見込み額(円) */
  publicPensionAnnual: number;
  /** 年金以外の所得(円、C案入力。デフォルト0) */
  otherIncome: number;
  /** 会社の退職金額(円、詳細設定。デフォルト0) */
  severance: number;
  /** 会社の勤続年数(詳細設定。デフォルト0) */
  sevYrs: number;
  /** iDeCo/DC年金の受給期間(年、5〜20年・5年刻み) */
  annuityYears: number;
}

export interface WithdrawalPatternResult {
  /** 比較期間(annuityYears年間)で受け取る総額(円) = iDeCo/DC残高 + 会社の退職金 + 公的年金のannuityYears年分 */
  grossIncome: number;
  /** 比較期間全体の税額合計(円) */
  totalTax: number;
  /** 比較期間全体の手取り総額(円) */
  netAmount: number;
  /** 実効税率(totalTax / grossIncome。grossIncome=0のときは0) */
  effectiveTaxRate: number;
  /** 一時金分(会社の退職金を含む)の内訳。同一年に受け取らない場合も計算自体は行われ、額面0円として返る */
  lumpSum: RetirementIncomeTaxResult;
  /**
   * 年金分の雑所得内訳(1年分)。65歳境界は受取開始年齢(input.receiveAge)の区分を
   * 比較期間全体に固定適用し、年ごとの再判定は行わない(年の途中で65歳をまたいでも
   * 区分は切り替えない。Methodologyに明記する)。
   */
  pension: PublicPensionTaxableIncomeResult;
  /** 総合課税(雑所得+その他所得)の内訳(1年分) */
  comprehensive: ComprehensiveIncomeTaxResult;
  /** 比較期間(年)。UI側で「この内訳を{annuityYears}年間受け取った場合の合計」等の表示に使う */
  annuityYears: number;
  /** 年金分の受取総額(1年あたり、円) = 公的年金 + iDeCo/DC年金(pension.deduction + pension.taxableIncomeとは
   *  一致しない場合がある。雑所得が控除額を下回り0円に切り捨てられるケースがあるため、こちらを正とする) */
  pensionGrossPerYear: number;
  /** 年金分の手取り(1年あたり、円) = pensionGrossPerYear - comprehensive.totalTax */
  pensionNetPerYear: number;
}

/**
 * 併用パターン:iDeCo/DC残高を一時金割合(lumpSumRatioPct)で一時金分・年金分に分割し、
 * 一時金分は退職所得(calcIdecoLumpSumTax、会社の退職金と合算・同一年一括受給)、
 * 年金分は公的年金と合算した総合課税(calcComprehensiveIncomeTax)を、annuityYears年間
 * 毎年同額受け取り続けるものと仮定して積み上げた合計で、それぞれ直接手取りを計算して合算する。
 *
 * 「手取り総額」はannuityYearsを全パターン共通の比較期間として揃える(確定仕様)。
 * 一時金(一括)と年金(分割払い)は本来受取タイミングが異なり単年比較は無意味なため、
 * 一時金パターン側にも「annuityYears年間、公的年金のみを受け取り続けた場合の合計手取り」を
 * 積み上げて初めてフェアな比較になる。
 *
 * lumpSumRatioPct=100 で一時金パターン、0 で年金パターンと完全に一致する
 * (calcLumpSumPattern/calcPensionPattern はこの関数の薄いラッパーとして実装している)。
 *
 * @param lumpSumRatioPct 一時金割合(0〜100、10%刻みを想定)
 */
export function calcMixedPattern(
  input: IdecoWithdrawalInput,
  lumpSumRatioPct: number
): WithdrawalPatternResult {
  const ratio = lumpSumRatioPct / 100;
  const lumpSumPortion = Math.round(input.idecoBalance * ratio);
  const pensionPortion = input.idecoBalance - lumpSumPortion;

  // 一時金分(会社の退職金を含む、同一年一括受給)
  const lumpSum = calcIdecoLumpSumTax(lumpSumPortion, input.severance, input.idecoYrs, input.sevYrs);

  // 年金分(公的年金+DC年金残り部分、1年分)。65歳境界はinput.receiveAgeの区分を
  // 比較期間全体に固定適用する(年ごとの再判定はしない)。
  const idecoAnnual = pensionPortion / input.annuityYears;
  const pension = calcPublicPensionTaxableIncome(input.publicPensionAnnual, idecoAnnual, input.receiveAge);
  const comprehensive = calcComprehensiveIncomeTax(pension.taxableIncome, input.otherIncome);

  // 年金分をannuityYears年間、毎年同額受け取り続けるものとして積み上げる
  const pensionGrossPerYear = input.publicPensionAnnual + idecoAnnual;
  const pensionNetPerYear = pensionGrossPerYear - comprehensive.totalTax;
  const pensionGrossTotal = pensionGrossPerYear * input.annuityYears;
  const pensionNetTotal = pensionNetPerYear * input.annuityYears;
  const pensionTaxTotal = comprehensive.totalTax * input.annuityYears;

  const grossIncome = lumpSumPortion + input.severance + pensionGrossTotal;
  const totalTax = lumpSum.incomeTax + lumpSum.residentTax.total + pensionTaxTotal;
  const netAmount = lumpSum.netAmount + pensionNetTotal;
  const effectiveTaxRate = grossIncome > 0 ? totalTax / grossIncome : 0;

  return {
    grossIncome,
    totalTax,
    netAmount,
    effectiveTaxRate,
    lumpSum,
    pension,
    comprehensive,
    annuityYears: input.annuityYears,
    pensionGrossPerYear,
    pensionNetPerYear,
  };
}

/** 一時金パターン:iDeCo/DC残高全額を一時金(退職所得)として受け取る(calcMixedPattern(input, 100)と同一)。 */
export function calcLumpSumPattern(input: IdecoWithdrawalInput): WithdrawalPatternResult {
  return calcMixedPattern(input, 100);
}

/** 年金パターン:iDeCo/DC残高全額を年金(雑所得)として受け取る(calcMixedPattern(input, 0)と同一)。 */
export function calcPensionPattern(input: IdecoWithdrawalInput): WithdrawalPatternResult {
  return calcMixedPattern(input, 0);
}
