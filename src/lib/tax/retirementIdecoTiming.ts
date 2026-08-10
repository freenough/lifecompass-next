/**
 * src/lib/tax/retirementIdecoTiming.ts
 *
 * 退職金×iDeCo受給タイミング比較ツール(第9弾ツール)の計算ロジック。
 * 既存の税計算(控除額・累進課税・住民税)は再実装せず、src/lib/tax/retirement.ts の
 * 関数をそのまま呼び出す。retirement.ts / ideco.ts 本体は無変更。
 *
 * 根拠:
 * - 国税庁タックスアンサーNo.2735(退職所得の受給者の申告と源泉徴収)
 * - docs/fixes/done/REFERENCE_retirement_ideco_tax_rules.md(19年・10年ルールの
 *   一次情報調査。2026年1月改正で「前年以前4年以内」→「前年以前9年以内」に延長された経緯を含む)
 *
 * 対象外(UI側で注記すること):
 * - 役員退職金等(特定役員退職手当等・短期退職手当等)。isExecutive・hasDisabilityExceptionは常にfalse固定
 * - 現行制度(令和8年1月1日以降)のみ前提。旧ルールとの年度切替は扱わない
 * - 所得税法施行令第70条の例外規定(先行受給額が自身の控除額に満たない場合の「みなし勤続期間」)
 *
 * 金額は全て「円」単位で扱う(呼び出し側で万円→円の変換を行うこと)。
 */

import {
  calcRetirementIncomeTax,
  type RetirementIncomeTaxResult,
} from "./retirement";

// ============================================================
// (1) 重複期間・合算勤続年数の算出
// ============================================================

export interface OverlapResult {
  /** 退職金の勤続開始年齢 = 退職金受給年齢 - 勤続年数 */
  retireStartAge: number;
  /** iDeCoの加入開始年齢 = iDeCo受給年齢 - iDeCo加入期間 */
  idecoStartAge: number;
  /** 重複期間(年、区間の和集合ではなく積集合の長さ。0未満にはならない) */
  overlapYears: number;
  /** 合算勤続年数 = 勤続年数 + iDeCo加入期間 - 重複期間 */
  combinedServiceYears: number;
}

/**
 * 退職金の勤続期間とiDeCoの加入期間を、年齢軸上の区間としてとらえたときの
 * 重複期間(積集合の長さ)を算出する。西暦年・カレンダー年は保持せず、
 * 年齢ベースの相対期間のみで計算する。
 *
 * 重複期間 = max(0, min(退職金受給年齢, iDeCo受給年齢) - max(退職金開始年齢, iDeCo開始年齢))
 * 合算勤続年数 = 勤続年数 + iDeCo加入期間 - 重複期間
 *
 * (単純な「期間の外周」ではなく区間の積集合で計算する。隣接・完全分離のケースで
 * 重複期間が正しく0年になることをverify-retirement-ideco-timing-tool.jsの
 * 4パターンテストで確認している)
 */
export function calcOverlapYears(
  retireAge: number,
  serviceYears: number,
  idecoAge: number,
  idecoYears: number
): OverlapResult {
  const retireStartAge = retireAge - serviceYears;
  const idecoStartAge = idecoAge - idecoYears;

  const overlapYears = Math.max(
    0,
    Math.min(retireAge, idecoAge) - Math.max(retireStartAge, idecoStartAge)
  );
  const combinedServiceYears = serviceYears + idecoYears - overlapYears;

  return { retireStartAge, idecoStartAge, overlapYears, combinedServiceYears };
}

// ============================================================
// (2) 適用ルールの判定
// ============================================================

export type ReceiveOrder = "retirement_first" | "ideco_first" | "same_year";
export type AppliedRule = "nineteen_year_rule" | "ten_year_rule";

export interface RuleApplicabilityResult {
  /** 表示用の受給順序(同一年齢はsame_yearとして区別する。計算上の先後判定とは別軸) */
  order: ReceiveOrder;
  /** 受給間隔(年) = |退職金受給年齢 - iDeCo受給年齢| */
  interval: number;
  /** 適用されるルール(退職金が先または同一年齢なら19年ルール、iDeCoが先なら10年ルール) */
  appliedRule: AppliedRule;
  /** 重複排除(合算計算)の対象になるか */
  isAdjustmentApplicable: boolean;
}

/**
 * 受給順序と受給間隔から、適用されるルール(19年ルール/10年ルール)と
 * 重複排除の対象になるかどうかを判定する。
 *
 * 退職金受給年齢 <= iDeCo受給年齢(同一年齢を含む) → 「退職金が先」→ 19年ルール
 *   対象判定: 受給間隔 <= 19
 * 退職金受給年齢 > iDeCo受給年齢                  → 「iDeCoが先」→ 10年ルール
 *   対象判定: 受給間隔 <= 9
 *   (通称は「10年ルール」だが、判定の閾値は国税庁の条文上「前年以前9年内」＝受給間隔が
 *   9年以下のとき対象、10年以上間隔を空ければ対象外になる。2026年1月の税制改正で
 *   「前年以前4年以内」から延長された。docs/fixes/done/REFERENCE_retirement_ideco_tax_rules.md参照)
 *
 * 同一年齢(受給間隔0)は「退職金が先」側(19年ルール)の判定ロジックに含める(仕様通り)。
 * 表示用のorderのみsame_yearとして区別する(税額計算上の先後判定には影響しない)。
 */
export function determineRuleApplicability(
  retireAge: number,
  idecoAge: number
): RuleApplicabilityResult {
  const interval = Math.abs(retireAge - idecoAge);
  const order: ReceiveOrder =
    retireAge === idecoAge
      ? "same_year"
      : retireAge < idecoAge
        ? "retirement_first"
        : "ideco_first";

  if (retireAge <= idecoAge) {
    return { order, interval, appliedRule: "nineteen_year_rule", isAdjustmentApplicable: interval <= 19 };
  }
  return { order, interval, appliedRule: "ten_year_rule", isAdjustmentApplicable: interval <= 9 };
}

// ============================================================
// (3) 税額計算
// ============================================================

/**
 * 2回目受給時に実際に源泉徴収される税額を計算する
 * (国税庁タックスアンサーNo.2735の「合算→2回目は差額」という構造)。
 *
 * @param combinedTotalTax 退職金+iDeCo一時金を合算し、合算勤続年数で計算した場合の税額
 *   (所得税+復興特別所得税+住民税、円)
 * @param firstTotalTax 1回目の受給額のみで独立計算した場合の税額(実際に1回目で
 *   源泉徴収された額、円)
 * @returns 2回目受給時に源泉徴収される税額(円)。マイナスにならないようフロア処理する
 *   (マイナスになる場合、還付を受けるには確定申告が必要)
 */
export function calculateSecondWithholdingTax(
  combinedTotalTax: number,
  firstTotalTax: number
): number {
  return Math.max(0, combinedTotalTax - firstTotalTax);
}

function totalTaxOf(result: RetirementIncomeTaxResult): number {
  return result.incomeTax + result.residentTax.total;
}

export interface RetirementIdecoTimingInput {
  /** 退職金受給年齢 */
  retireAge: number;
  /** 勤続年数 */
  serviceYears: number;
  /** 退職金額(万円) */
  retireIncomeManYen: number;
  /** iDeCo受給年齢 */
  idecoAge: number;
  /** iDeCo加入期間(年) */
  idecoYears: number;
  /** iDeCo一時金額(万円) */
  idecoIncomeManYen: number;
}

export interface RetirementIdecoTimingResult {
  overlap: OverlapResult;
  rule: RuleApplicabilityResult;
  /** 退職金のみで独立計算した場合の結果(常に算出する。調整対象外の場合は実際の値そのもの) */
  retirementIndependent: RetirementIncomeTaxResult;
  /** iDeCoのみで独立計算した場合の結果(常に算出する。調整対象外の場合は実際の値そのもの) */
  idecoIndependent: RetirementIncomeTaxResult;
  /** 調整対象の場合のみ算出する、合算勤続年数ベースの計算結果。対象外の場合はnull */
  combined: RetirementIncomeTaxResult | null;
  /** 実際に1回目の受給時に源泉徴収される税額(円)。常に独立計算の値と一致する */
  firstWithholdingTax: number;
  /** 実際に2回目の受給時に源泉徴収される税額(円)。
   *  調整対象:合算ベースの税額から1回目分を差し引いた差額(マイナス時は0)
   *  調整対象外:2回目の受給額のみによる独立計算の税額 */
  secondWithholdingTax: number;
  /** 手取り合計(円) = (退職金額+iDeCo一時金額) - firstWithholdingTax - secondWithholdingTax */
  totalNetAmount: number;
}

/**
 * 退職金×iDeCo受給タイミング比較のメイン計算関数。
 *
 * 「1回目/2回目」は、受給順序(retireAge <= idecoAge なら退職金が先)に従って決まる。
 * 同一年齢(受給間隔0)の場合も「退職金が先」側として扱う(determineRuleApplicability参照)。
 * この場合でも、firstWithholdingTax + secondWithholdingTax の合計は必ず combinedTotalTax と
 * 一致する(firstTotalTaxが差分計算の中で相殺されるため、内訳の呼び名に関わらず合計は不変)。
 */
export function calcRetirementIdecoTiming(
  input: RetirementIdecoTimingInput
): RetirementIdecoTimingResult {
  const overlap = calcOverlapYears(
    input.retireAge,
    input.serviceYears,
    input.idecoAge,
    input.idecoYears
  );
  const rule = determineRuleApplicability(input.retireAge, input.idecoAge);

  const retireIncomeYen = input.retireIncomeManYen * 10_000;
  const idecoIncomeYen = input.idecoIncomeManYen * 10_000;

  const retirementIndependent = calcRetirementIncomeTax(
    retireIncomeYen,
    input.serviceYears,
    false,
    false
  );
  const idecoIndependent = calcRetirementIncomeTax(
    idecoIncomeYen,
    input.idecoYears,
    false,
    false
  );

  // 「1回目/2回目」は受給順序(退職金受給年齢 <= iDeCo受給年齢なら退職金が先)で決まる。
  // 対象外の場合も表示上の1回目/2回目をこの順序に揃えておく(調整対象になる/ならないで
  // 呼び名が入れ替わるとUI上混乱するため)。
  const isRetirementFirst = rule.order !== "ideco_first";
  const firstIndependent = isRetirementFirst ? retirementIndependent : idecoIndependent;
  const secondIndependent = isRetirementFirst ? idecoIndependent : retirementIndependent;

  if (!rule.isAdjustmentApplicable) {
    // 対象外:それぞれ自分自身の年数のみで独立計算する
    return {
      overlap,
      rule,
      retirementIndependent,
      idecoIndependent,
      combined: null,
      firstWithholdingTax: totalTaxOf(firstIndependent),
      secondWithholdingTax: totalTaxOf(secondIndependent),
      totalNetAmount: retirementIndependent.netAmount + idecoIndependent.netAmount,
    };
  }

  // 対象:合算勤続年数で計算した「合算ベースの税額」から、1回目の独立税額を差し引いた
  // 差額を2回目の源泉徴収税額とする(国税庁タックスアンサーNo.2735の方式)。
  const combinedIncome = retireIncomeYen + idecoIncomeYen;
  const combined = calcRetirementIncomeTax(
    combinedIncome,
    overlap.combinedServiceYears,
    false,
    false
  );

  const combinedTotalTax = totalTaxOf(combined);
  const firstWithholdingTax = totalTaxOf(firstIndependent);
  const secondWithholdingTax = calculateSecondWithholdingTax(combinedTotalTax, firstWithholdingTax);

  return {
    overlap,
    rule,
    retirementIndependent,
    idecoIndependent,
    combined,
    firstWithholdingTax,
    secondWithholdingTax,
    totalNetAmount: retireIncomeYen + idecoIncomeYen - firstWithholdingTax - secondWithholdingTax,
  };
}
