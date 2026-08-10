/**
 * src/lib/tax/retirement.ts
 *
 * 退職金手取り計算ツール(第5弾ツール)の税計算ロジック。
 * 本体シミュレーターの retirementTaxCalc()(helpers.ts、一律20.315%の意図的簡易近似)とは
 * 独立した実装。国税庁の一次情報(令和8年分)に完全準拠した累進課税を行う。
 *
 * 参照:product_spec_retirement_tax_tool.md
 *
 * 金額は全て「円」単位で扱う(呼び出し側で万円→円の変換を行うこと)。
 */

export type RetirementPayType =
  | "general" // 一般退職手当等
  | "short_term" // 短期退職手当等(勤続5年以下・役員等以外)
  | "specified_executive"; // 特定役員退職手当等(役員等・勤続5年以下)

export interface RetirementIncomeTaxResult {
  /** 退職手当等の種類(自動判定結果) */
  payType: RetirementPayType;
  /** 退職所得控除額(円) */
  deduction: number;
  /** 課税退職所得金額(円、1,000円未満切り捨て後) */
  taxableIncome: number;
  /** 所得税+復興特別所得税(円、1円未満切り捨て後) */
  incomeTax: number;
  /** 住民税内訳 */
  residentTax: {
    /** 市民税(円、100円未満切り捨て後) */
    municipal: number;
    /** 県民税(円、100円未満切り捨て後) */
    prefectural: number;
    /** 住民税合計 */
    total: number;
  };
  /** 手取り額(円) = 収入 - 所得税 - 住民税合計 */
  netAmount: number;
}

/**
 * Step 1: 退職所得控除額を計算する
 *
 * @param serviceYears 勤続年数(1年未満の端数は呼び出し側で切り上げ済みであること)
 * @param hasDisabilityException 障害者となったことに直接起因する退職か
 * @returns 退職所得控除額(円)
 */
export function calcRetirementDeduction(
  serviceYears: number,
  hasDisabilityException: boolean
): number {
  let deductionManYen: number; // 万円単位で計算し、最後に円へ変換

  if (serviceYears <= 20) {
    // 40万円×勤続年数(最低80万円)
    deductionManYen = Math.max(40 * serviceYears, 80);
  } else {
    // 800万円+70万円×(勤続年数-20年)
    deductionManYen = 800 + 70 * (serviceYears - 20);
  }

  if (hasDisabilityException) {
    deductionManYen += 100;
  }

  return deductionManYen * 10_000;
}

/**
 * 退職手当等の種類を自動判定する(ユーザーには見せない内部ロジック)
 */
function determinePayType(
  serviceYears: number,
  isExecutive: boolean
): RetirementPayType {
  if (serviceYears > 5) {
    return "general";
  }
  return isExecutive ? "specified_executive" : "short_term";
}

/**
 * Step 2: 課税退職所得金額を計算する
 *
 * @param income 退職手当等の収入金額(円)
 * @param deduction 退職所得控除額(円、calcRetirementDeduction()の戻り値)
 * @param serviceYears 勤続年数
 * @param isExecutive 役員等か(勤続5年以下の場合のみ意味を持つ)
 * @returns 課税退職所得金額(円、1,000円未満切り捨て済み)
 */
export function calcRetirementTaxableIncome(
  income: number,
  deduction: number,
  serviceYears: number,
  isExecutive: boolean
): number {
  const payType = determinePayType(serviceYears, isExecutive);
  // 0円下限:控除額が収入を上回る場合はマイナスにしない
  const base = Math.max(0, income - deduction);

  let taxableIncome: number;

  switch (payType) {
    case "general": {
      taxableIncome = base * 0.5;
      break;
    }
    case "short_term": {
      const THRESHOLD = 3_000_000; // 300万円
      if (base <= THRESHOLD) {
        taxableIncome = base * 0.5;
      } else {
        // 300万円以下部分は1/2、300万円超部分は1/2適用なし
        taxableIncome = THRESHOLD * 0.5 + (base - THRESHOLD);
      }
      break;
    }
    case "specified_executive": {
      // 1/2適用なし、全額
      taxableIncome = base;
      break;
    }
  }

  // 端数処理:1,000円未満切り捨て
  // 浮動小数点誤差により本来割り切れる値がわずかに下振れするケースを防ぐため、
  // 微小なイプシロンを加えてからfloorする(例: 50000*1.021が51049.99999999999になる問題と同種)。
  return Math.floor(taxableIncome / 1_000 + 1e-6) * 1_000;
}

/**
 * 令和8年分・源泉徴収税額速算表(所得税の速算表と共通)
 * (課税所得金額 × 税率 - 控除額) の形で使用する。
 * 退職所得(分離課税)・総合課税いずれも、税率表自体は同一のものを使う
 * (第6弾ツール src/lib/tax/ideco.ts の calcComprehensiveIncomeTax() から
 * calcProgressiveIncomeTax() を再利用することで、この表を共有している)。
 */
const INCOME_TAX_BRACKETS: Array<{
  upTo: number; // この金額以下(円)。Infinityは上限なし
  rate: number;
  deduction: number; // 円
}> = [
  { upTo: 1_950_000, rate: 0.05, deduction: 0 },
  { upTo: 3_300_000, rate: 0.1, deduction: 97_500 },
  { upTo: 6_950_000, rate: 0.2, deduction: 427_500 },
  { upTo: 9_000_000, rate: 0.23, deduction: 636_000 },
  { upTo: 18_000_000, rate: 0.33, deduction: 1_536_000 },
  { upTo: 40_000_000, rate: 0.4, deduction: 2_796_000 },
  { upTo: Infinity, rate: 0.45, deduction: 4_796_000 },
];

export const RECONSTRUCTION_SURTAX_RATE = 1.021; // 復興特別所得税込み(102.1%)
const MUNICIPAL_TAX_RATE = 0.06; // 市民税(標準税率)
const PREFECTURAL_TAX_RATE = 0.04; // 県民税(標準税率)

/**
 * 課税所得金額から、超過累進税率表(5%〜45%)を適用した所得税額(円)を計算する共通関数。
 * 退職所得(分離課税)・総合課税のどちらでも同じ税率表を使うため、
 * src/lib/tax/ideco.ts の calcComprehensiveIncomeTax() からも再利用する。
 *
 * 戻り値は「端数処理前・復興特別所得税を含まない」生の金額(円、浮動小数点)。
 * 端数処理(1円未満切り捨て等)・復興特別所得税の加算は呼び出し側の責務とする。
 * これにより、呼び出し側ごとに異なる丸め順序(退職所得は「復興特別所得税込みで
 * 1回だけ切り捨て」、総合課税は「所得税を先に切り捨ててから複興特別所得税を
 * 別途計算」)を、この関数の中身を変えずに実現できる。
 */
export function calcProgressiveIncomeTax(taxableIncome: number): number {
  const bracket = INCOME_TAX_BRACKETS.find((b) => taxableIncome <= b.upTo)!;
  return taxableIncome * bracket.rate - bracket.deduction;
}

/**
 * 課税所得金額から住民税額(市民税6%+県民税4%、標準税率)を計算する共通関数。
 * 市民税・県民税をそれぞれ100円未満切り捨ててから合算する(一括計算後に
 * 切り捨てると実務上の金額とズレるため)。src/lib/tax/ideco.ts からも再利用する。
 */
export function calcResidentTax(taxableIncome: number): {
  municipal: number;
  prefectural: number;
  total: number;
} {
  const municipal =
    Math.floor((taxableIncome * MUNICIPAL_TAX_RATE) / 100 + 1e-6) * 100;
  const prefectural =
    Math.floor((taxableIncome * PREFECTURAL_TAX_RATE) / 100 + 1e-6) * 100;
  return { municipal, prefectural, total: municipal + prefectural };
}

/**
 * Step 3〜5: 所得税・住民税・手取り額を計算するメイン関数
 *
 * @param income 退職手当等の収入金額(円)
 * @param serviceYears 勤続年数
 * @param isExecutive 役員等か(勤続5年以下の場合のみ意味を持つ)
 * @param hasDisabilityException 障害者特例の対象か
 */
export function calcRetirementIncomeTax(
  income: number,
  serviceYears: number,
  isExecutive: boolean,
  hasDisabilityException: boolean
): RetirementIncomeTaxResult {
  const payType = determinePayType(serviceYears, isExecutive);
  const deduction = calcRetirementDeduction(serviceYears, hasDisabilityException);
  const taxableIncome = calcRetirementTaxableIncome(
    income,
    deduction,
    serviceYears,
    isExecutive
  );

  // Step 3: 所得税(復興特別所得税込み)
  // 退職所得は「(税率適用後の額)×102.1%」を1回だけ切り捨てる、という既存の丸め方を
  // そのまま維持する(calcProgressiveIncomeTax()の生値に対して従来と同じ演算順序で
  // 復興特別所得税分を掛けてから切り捨てるため、リファクタリング前と結果は変わらない)。
  const rawIncomeTax =
    calcProgressiveIncomeTax(taxableIncome) * RECONSTRUCTION_SURTAX_RATE;
  // 浮動小数点誤差対策(例: 50000*1.021が51049.99999999999になり、本来51050円のところ
  // 51049円にfloorされてしまう問題)として、floor前に微小なイプシロンを加える。
  const incomeTax = Math.max(0, Math.floor(rawIncomeTax + 1e-6)); // 1円未満切り捨て

  // Step 4: 住民税(市民税・県民税を別々に計算し、それぞれ100円未満切り捨ててから合算)
  const { municipal, prefectural, total: residentTaxTotal } =
    calcResidentTax(taxableIncome);

  // Step 5: 手取り額
  const netAmount = income - incomeTax - residentTaxTotal;

  return {
    payType,
    deduction,
    taxableIncome,
    incomeTax,
    residentTax: {
      municipal,
      prefectural,
      total: residentTaxTotal,
    },
    netAmount,
  };
}
