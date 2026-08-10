/**
 * src/lib/tax/retirementIdecoTiming.ts
 *
 * 退職金×iDeCo受給タイミング比較ツール(第9弾ツール)の計算ロジック。
 * 既存の税計算(控除額・累進課税・住民税)は再実装せず、src/lib/tax/retirement.ts の
 * 関数をそのまま呼び出す。retirement.ts / ideco.ts 本体は無変更。
 *
 * 【2026-08-10 根本修正】受給パターンにより、計算方式を3つに分岐する:
 *
 * 1. 同一年受給(受給間隔0、パターンA相当) → 法30条5項・国税庁タックスアンサーNo.2735の
 *    「合算方式」(収入を合算し、勤続年数は長い方を採用して1本で計算)。既存の
 *    calcIdecoLumpSumTax()(ideco.ts、第6弾ツールで既に確立済みの実装)をそのまま再利用する。
 * 2. 異なる年受給・19年/10年ルール対象内(パターンB・C相当) → 所得税法施行令第70条第1項
 *    第2号・第2項に基づく「先に受け取った方(甲)は税額固定・後に受け取った方(乙)のみ
 *    控除額を減額計算する」方式(【重要】2026-08-10以前の実装は、この場合にも誤って
 *    パターン1の合算方式を流用していたバグがあり、本修正で是正した)。
 * 3. 対象外(19年/9年の窓を超える) → 甲・乙とも独立してフル控除計算(変更なし)。
 *
 * 財務省「令和7年度税制改正 所得税法等の改正」p.118-121で、条文構造(4年/9年/19年の
 * 使い分け、みなし勤続期間の計算式、パターン1と2が別の条文根拠を持つこと)を確認済み
 * (docs/fixes/done/REFERENCE_retirement_ideco_tax_rules.md も参照)。
 *
 * 根拠:
 * - 所得税法第30条第5項(同一年複数受給の合算課税)・国税庁タックスアンサーNo.2735
 * - 所得税法施行令第70条第1項第2号・第2項(異なる年受給の重複排除・退職所得控除額の計算の特例)
 * - 財務省「令和7年度税制改正 所得税法等の改正」p.118-121
 * - docs/fixes/done/REFERENCE_retirement_ideco_tax_rules.md
 *
 * 対象外(UI側で注記すること):
 * - 役員退職金等(特定役員退職手当等・短期退職手当等)。isExecutive・hasDisabilityExceptionは常にfalse固定
 * - 現行制度(令和8年1月1日以降)のみ前提。旧ルールとの年度切替は扱わない
 * - 所得税法施行令第70条の例外規定のうち、先行受給額(甲)が自身の退職所得控除額に
 *   満たない場合の「みなし勤続期間」の特例は実装済みだが、それ以外の細目
 *   (例:3件以上の多重受給)は対象外
 *
 * 金額は全て「円」単位で扱う(呼び出し側で万円→円の変換を行うこと)。
 */

import {
  calcRetirementDeduction,
  calcRetirementTaxableIncome,
  calcRetirementIncomeTax,
  calcProgressiveIncomeTax,
  calcResidentTax,
  RECONSTRUCTION_SURTAX_RATE,
} from "./retirement";
import { calcIdecoLumpSumTax } from "./ideco";

// ============================================================
// (2) 適用ルールの判定(2026-08-10修正で変更なし。財務省資料で正当性を確認済み)
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
  /** 重複排除の対象になるか */
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
 *   「前年以前4年以内」から延長された。財務省「令和7年度税制改正」p.120-121で、
 *   この4→9年の延長が「iDeCoが先→退職金が後」の方向にのみ適用されることを確認済み
 *   (「退職金が先→iDeCoが後」の19年内側は改正前から変更なし))
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
// (3) みなし勤続期間の特例(施行令70条2項)
// ============================================================

export interface DeemedServicePeriod {
  /** みなし勤続期間の特例が適用されたか(甲の収入額 < 甲の満額控除額のとき適用) */
  applied: boolean;
  /** 甲の満額控除額(円、施行令70条2項の適用判定に使用) */
  fullDeduction: number;
  /** 適用された場合のみなし勤続年数(1年未満切り捨て)。非適用の場合はnull */
  deemedYears: number | null;
}

/**
 * 施行令70条2項:甲(先に受け取った方)の収入金額が、甲自身の退職所得控除額(重複調整
 * 前の満額)に満たないとき、甲の勤続期間等を実際より短い「みなし勤続期間」とみなして
 * 重複期間の計算に使う特例。
 *
 * みなし勤続年数 = 甲の収入額(万円)が800万円以下 → 収入額 ÷ 40万円(1未満切り捨て)
 *                 800万円超               → (収入額 − 800万円) ÷ 70万円 + 20(1未満切り捨て)
 */
function calcDeemedServicePeriod(
  firstIncomeYen: number,
  firstServiceYears: number
): DeemedServicePeriod {
  const fullDeduction = calcRetirementDeduction(firstServiceYears, false);
  if (firstIncomeYen >= fullDeduction) {
    return { applied: false, fullDeduction, deemedYears: null };
  }
  const incomeManYen = firstIncomeYen / 10_000;
  const deemedYears =
    incomeManYen <= 800
      ? Math.floor(incomeManYen / 40)
      : Math.floor((incomeManYen - 800) / 70 + 20);
  return { applied: true, fullDeduction, deemedYears };
}

// ============================================================
// (4) 重複期間・乙の控除額の減額計算(施行令70条1項2号)
// ============================================================

export interface DuplicateAdjustment {
  /** 甲(先に受け取った方)の実勤続(加入)開始年齢 */
  firstStartAge: number;
  /** 甲へのみなし勤続期間特例の適用結果 */
  deemed: DeemedServicePeriod;
  /** 甲の実効期間の終了年齢(みなし適用時は短縮後、非適用時は甲の受給年齢そのもの) */
  firstEffectiveEndAge: number;
  /** 乙(後に受け取った方)の実勤続(加入)開始年齢 */
  secondStartAge: number;
  /** 重複期間(年) = 甲の実効期間と乙の実期間の積集合 */
  overlapYears: number;
  /** (イ)乙自身の満額控除額(円、重複調整前) */
  secondFullDeduction: number;
  /** (ロ)重複期間を勤続年数とみなして計算した控除額(円) */
  overlapDeduction: number;
  /** 乙の控除額 = max(0, (イ) − (ロ))(円) */
  secondAdjustedDeduction: number;
}

/**
 * 重複期間 = max(0, min(乙の受給年齢, 甲の実効期間の終了年齢) − max(乙の実期間開始, 甲の実開始年齢))
 * 乙の控除額 = max(0, 乙自身の満額控除額 − 重複期間分の控除額)
 *
 * (イ)(ロ)とも既存のcalcRetirementDeduction()(80万円下限込み)をそのまま使う。これは
 * 単純化のための近似ではなく、施行令70条2項の文言「その重複している部分の期間を
 * 法第30条第3項の勤続年数とみなして『同項の規定を適用して』計算した金額」を、
 * 「重複期間を勤続年数とみなして、法30条3項の規定(80万円下限を含む)を丸ごと適用する」
 * 趣旨と解釈した結果の意図的な実装(2026-08-10確定)。したがって(ロ)の計算では、重複期間が
 * 1〜2年ときわめて短い場合でも「40万円×年数」の単純計算にはならず、80万円下限が
 * 正しく適用される(verify-retirement-ideco-timing-tool.jsの「重複期間1年・2年」テストで
 * この挙動を固定化している。将来「バグ」として誤って単純計算に修正しないこと)。
 */
function calcDuplicateAdjustment(
  firstAge: number,
  firstServiceYears: number,
  firstIncomeYen: number,
  secondAge: number,
  secondServiceYears: number
): DuplicateAdjustment {
  const deemed = calcDeemedServicePeriod(firstIncomeYen, firstServiceYears);
  const firstStartAge = firstAge - firstServiceYears;
  const firstEffectiveEndAge = deemed.applied
    ? firstStartAge + (deemed.deemedYears as number)
    : firstAge;
  const secondStartAge = secondAge - secondServiceYears;

  const overlapYears = Math.max(
    0,
    Math.min(firstEffectiveEndAge, secondAge) - Math.max(firstStartAge, secondStartAge)
  );

  const secondFullDeduction = calcRetirementDeduction(secondServiceYears, false);
  const overlapDeduction = calcRetirementDeduction(overlapYears, false);
  const secondAdjustedDeduction = Math.max(0, secondFullDeduction - overlapDeduction);

  return {
    firstStartAge,
    deemed,
    firstEffectiveEndAge,
    secondStartAge,
    overlapYears,
    secondFullDeduction,
    overlapDeduction,
    secondAdjustedDeduction,
  };
}

// ============================================================
// (5) 乙の税額計算(調整後の控除額から)
// ============================================================

export interface TaxResult {
  deduction: number;
  taxableIncome: number;
  incomeTax: number;
  residentTax: { municipal: number; prefectural: number; total: number };
  netAmount: number;
}

/**
 * calcRetirementIncomeTax()は「勤続年数から控除額を自動算出する」設計のため、施行令70条の
 * 調整後控除額を直接使って税額計算する経路がない。calcRetirementTaxableIncome()は
 * deductionを直接指定できる既存のexport関数のためそのまま再利用し(1/2課税・短期退職
 * 手当等の区分・1,000円未満端数処理は既存ロジックのまま)、税額算出はcalcProgressiveIncomeTax・
 * calcResidentTaxという既存の共通関数をretirement.ts本体のcalcRetirementIncomeTax()と
 * 同じ端数処理(復興特別所得税分を掛けてから1回だけfloor)で組み合わせるだけの薄いヘルパー。
 * 税率表・控除計算自体は一切再実装しない。
 */
function calcTaxFromDeductionAndIncome(
  incomeYen: number,
  deduction: number,
  serviceYears: number
): TaxResult {
  const taxableIncome = calcRetirementTaxableIncome(incomeYen, deduction, serviceYears, false);
  const rawIncomeTax = calcProgressiveIncomeTax(taxableIncome) * RECONSTRUCTION_SURTAX_RATE;
  const incomeTax = Math.max(0, Math.floor(rawIncomeTax + 1e-6));
  const residentTax = calcResidentTax(taxableIncome);
  const netAmount = incomeYen - incomeTax - residentTax.total;
  return { deduction, taxableIncome, incomeTax, residentTax, netAmount };
}

// ============================================================
// メイン計算関数
// ============================================================

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

export type CalculationMode = "combined" | "independent" | "duplicate_adjustment";

export interface RetirementIdecoTimingResult {
  rule: RuleApplicabilityResult;
  /** どの計算方式が使われたか("combined"=同一年合算方式、"independent"=対象外の独立計算、
   *  "duplicate_adjustment"=施行令70条の甲固定・乙減額計算) */
  mode: CalculationMode;
  /** mode==="duplicate_adjustment"の場合のみ算出する重複排除の計算過程。それ以外はnull */
  adjustment: DuplicateAdjustment | null;
  /** mode==="combined"の場合のみ算出する合算計算結果(法30条5項)。それ以外はnull */
  combinedResult: TaxResult | null;
  /** 甲(先に受け取った方)の税額計算結果。mode==="combined"のときはnull
   *  (合算方式では「甲/乙」という区別自体が存在しないため) */
  firstResult: TaxResult | null;
  /** 乙(後に受け取った方)の税額計算結果。mode==="combined"のときはnull */
  secondResult: TaxResult | null;
  /** 手取り合計(円) */
  totalNetAmount: number;
}

/**
 * 退職金×iDeCo受給タイミング比較のメイン計算関数。
 *
 * 1. 同一年受給(rule.order==="same_year") → 法30条5項の合算方式。既存のcalcIdecoLumpSumTax()
 *    (ideco.ts)をそのまま再利用する(収入合算・勤続年数は長い方を採用)。
 * 2. 異なる年受給・調整対象外(!rule.isAdjustmentApplicable) → 甲・乙とも自分自身の
 *    年数のみで独立計算する(変更なし)。
 * 3. 異なる年受給・調整対象内 → 甲(先に受け取った方)の税額は完全固定(独立計算のまま)。
 *    乙(後に受け取った方)のみ、施行令70条の「重複期間を勤続年数とみなして計算した控除額」を
 *    差し引いた調整後の控除額で税額を計算し直す。
 *
 * 「甲(1回目)/乙(2回目)」は、受給順序(retireAge <= idecoAge なら退職金が先=甲)に従って決まる。
 */
export function calcRetirementIdecoTiming(
  input: RetirementIdecoTimingInput
): RetirementIdecoTimingResult {
  const rule = determineRuleApplicability(input.retireAge, input.idecoAge);

  const retireIncomeYen = input.retireIncomeManYen * 10_000;
  const idecoIncomeYen = input.idecoIncomeManYen * 10_000;

  if (rule.order === "same_year") {
    // 法30条5項:同一年に2件受け取る場合の合算方式(既存のcalcIdecoLumpSumTaxをそのまま再利用)
    const combinedResult = calcIdecoLumpSumTax(
      idecoIncomeYen,
      retireIncomeYen,
      input.idecoYears,
      input.serviceYears
    );
    return {
      rule,
      mode: "combined",
      adjustment: null,
      combinedResult,
      firstResult: null,
      secondResult: null,
      totalNetAmount: combinedResult.netAmount,
    };
  }

  const isRetirementFirst = rule.order === "retirement_first";
  const firstAge = isRetirementFirst ? input.retireAge : input.idecoAge;
  const firstServiceYears = isRetirementFirst ? input.serviceYears : input.idecoYears;
  const firstIncomeYen = isRetirementFirst ? retireIncomeYen : idecoIncomeYen;
  const secondAge = isRetirementFirst ? input.idecoAge : input.retireAge;
  const secondServiceYears = isRetirementFirst ? input.idecoYears : input.serviceYears;
  const secondIncomeYen = isRetirementFirst ? idecoIncomeYen : retireIncomeYen;

  // 甲(先に受け取った方)の税額は完全固定。既存関数をそのまま使う。
  const firstResult = calcRetirementIncomeTax(firstIncomeYen, firstServiceYears, false, false);

  if (!rule.isAdjustmentApplicable) {
    const secondResult = calcRetirementIncomeTax(secondIncomeYen, secondServiceYears, false, false);
    return {
      rule,
      mode: "independent",
      adjustment: null,
      combinedResult: null,
      firstResult,
      secondResult,
      totalNetAmount: firstResult.netAmount + secondResult.netAmount,
    };
  }

  const adjustment = calcDuplicateAdjustment(
    firstAge,
    firstServiceYears,
    firstIncomeYen,
    secondAge,
    secondServiceYears
  );
  const secondResult = calcTaxFromDeductionAndIncome(
    secondIncomeYen,
    adjustment.secondAdjustedDeduction,
    secondServiceYears
  );

  return {
    rule,
    mode: "duplicate_adjustment",
    adjustment,
    combinedResult: null,
    firstResult,
    secondResult,
    totalNetAmount: firstResult.netAmount + secondResult.netAmount,
  };
}
