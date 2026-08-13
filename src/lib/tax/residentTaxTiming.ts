/**
 * src/lib/tax/residentTaxTiming.ts
 *
 * 退職後の住民税キャッシュフロー試算ツール(第10弾ツール)の計算ロジック。
 * 参照:
 *   docs/fixes/active/impl_resident_tax_timing_stage1_v2.md(実装指示)
 *   docs/fixes/active/investigation_juminzei_taimurag.md(調査報告書1)
 *   docs/fixes/active/investigation_juminzei_futsuchoshu_wariate_result.md(調査報告書2)
 *
 * 住民税は「前年(1〜12月)の所得」を基準に、その年の6月から翌年5月まで特別徴収される。
 * 退職すると、その時点で徴収中の住民税年度の残額(波1)と、退職年の所得を基準にした
 * 翌年度の新規課税(波2)の2つのキャッシュアウトが発生する。本モジュールはこの2つを
 * 試算する。
 *
 * 金額は全て「円」単位で扱う(呼び出し側で万円→円の変換を行うこと)。
 */

import { calcResidentTax } from "./retirement";
import { RESIDENT_TAX_BASIC_DEDUCTION } from "./ideco";

// ============================================================
// 均等割(標準額)
// ============================================================

/**
 * 均等割標準額(道府県民税1,000円+市町村民税3,000円+森林環境税(国税・令和6年度から
 * 均等割と併せて賦課徴収)1,000円=合計5,000円/年)。
 * 出典: 総務省｜地方税制度｜個人住民税 https://www.soumu.go.jp/main_content/001005155.pdf
 *       総務省｜地方税制度｜森林環境税及び森林環境譲与税について
 *       https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/04000067.html
 * 自治体による超過課税の上乗せは本ツールでは考慮しない(簡易試算のため)。
 * 低所得者向けの非課税基準は簡易判定として別途 checkNonTaxable() で扱う(下記参照)。
 */
export const PER_CAPITA_TAX = 5_000;

// ============================================================
// 収入 → 課税所得の変換(波1・波2で共通)
// ============================================================

/**
 * 給与所得控除額を計算する(国税庁No.1410、令和7年分以後の速算表)。
 * 令和7年度税制改正(いわゆる「年収の壁」対応)により、最低保障額が55万円→65万円に、
 * その適用上限も収入190万円に引き上げられた(190万円超の各区分の式・金額自体に改正はない)。
 * 出典: 国税庁 No.1410 給与所得控除 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *       国税庁「令和7年度税制改正による所得税の基礎控除の見直し等について」
 *       https://www.nta.go.jp/users/gensen/2025kiso/index.htm
 *
 * 本来、収入660万円未満の部分は所得税法別表第五(4,000円刻みの区分表)を用いるのが正式ルールだが、
 * 本ツールは実務上広く使われる速算表による近似値を採用する。この近似の誤差は「近似値である」
 * という定性的なものではなく、収入が属する区分ごとに一意に決まる上限を持つ:
 *   190万円超〜360万円以下(30%区分): 最大1,200円(=4,000円×30%)
 *   360万円超〜660万円以下(20%区分): 最大800円(=4,000円×20%)
 *   660万円超〜850万円以下(10%区分): 最大400円(=4,000円×10%)
 *   それ以外の区分(190万円以下・850万円超): 差なし
 * これは、e-Gov法令API v2から取得した所得税法XML(所得税法別表第五)と本速算表を、
 * 190万・300万・360万・400万・500万・600万・660万円の8点で直接照合し、
 * 「別表第五は4,000円区分の下限額で速算式を1回計算し、区分全体に一律適用するステップ関数」
 * であることを確認した上で導出した理論上限(全区分で完全一致・差ゼロを確認済み)。
 * 出典: docs/fixes/active/betsuhyo5-extraction/investigation_report.md(2026-08-13付調査報告書)
 * この上限値は calcSalaryDeductionApproxMaxError() として関数化し、UI側の
 * assumptionNotesにも動的に反映する(全区分を羅列せず、該当区分の上限のみを表示する)。
 */
export function calcSalaryIncomeDeduction(incomeYen: number): number {
  if (incomeYen <= 1_900_000) return 650_000;
  if (incomeYen <= 3_600_000) return Math.floor(incomeYen * 0.3 + 80_000 + 1e-6);
  if (incomeYen <= 6_600_000) return Math.floor(incomeYen * 0.2 + 440_000 + 1e-6);
  if (incomeYen <= 8_500_000) return Math.floor(incomeYen * 0.1 + 1_100_000 + 1e-6);
  return 1_950_000;
}

/**
 * calcSalaryIncomeDeduction()の速算表近似が生む、所得税法別表第五との誤差の上限(円)。
 * 収入が属する区分によって一意に決まる(ランダムに変動する値ではない)。
 * 出典・根拠は calcSalaryIncomeDeduction() のコメント参照。
 */
export function calcSalaryDeductionApproxMaxError(incomeYen: number): number {
  if (incomeYen <= 1_900_000) return 0;
  if (incomeYen <= 3_600_000) return 1_200;
  if (incomeYen <= 6_600_000) return 800;
  if (incomeYen <= 8_500_000) return 400;
  return 0;
}

/** 年収から給与所得(給与所得控除後・住民税の基礎控除前の金額)を算出する。非課税判定にも使う。 */
function calcSalaryIncome(incomeYen: number): number {
  return Math.max(0, incomeYen - calcSalaryIncomeDeduction(incomeYen));
}

/**
 * 年収から住民税の課税所得金額を算出する共通変換関数(波1・波2の両方がこれを経由する)。
 * 年収 → 給与所得控除を差し引き「給与所得」 → 住民税の基礎控除(原則43万円、
 * src/lib/tax/ideco.ts の RESIDENT_TAX_BASIC_DEDUCTION を再利用。新規定数は作らない)を
 * 差し引き「課税所得」、の2段階。ここで得た課税所得を calcResidentTax() にそのまま渡す。
 */
export function calcTaxableSalaryIncome(incomeYen: number): number {
  return Math.max(0, calcSalaryIncome(incomeYen) - RESIDENT_TAX_BASIC_DEDUCTION);
}

/**
 * 給与所得控除の速算表近似について、収入が属する区分に応じた誤差上限の注記文を返す
 * (差がない区分ではnullを返し、UIに出さない)。
 */
function salaryDeductionApproxNote(waveLabel: string, incomeYen: number): string | null {
  const maxError = calcSalaryDeductionApproxMaxError(incomeYen);
  if (maxError === 0) return null;
  return `${waveLabel}の給与所得控除額は、所得税法別表第五(4,000円刻みの区分表)との間で、収入が属する区分に応じて最大${maxError.toLocaleString("ja-JP")}円程度の差が生じる場合があります(この差は区分ごとに一意に決まるものであり、ランダムに変動するものではありません)。`;
}

// ============================================================
// 住民税の非課税限度額(簡易判定)
// ============================================================

/**
 * 個人住民税の非課税限度額(単身・扶養なし・1級地の場合)。
 * 出典: 総務省「個人住民税について」(令和7年5月15日 税制調査会説明資料、2ページ
 * 「非課税ライン(単身者の場合)」)https://www.cao.go.jp/zei-cho/content/7zen5kai2.pdf
 * 「基本額等45万円(令和7年度改正でも変更なし)+給与所得控除65万円(令和8年度分から適用)
 * =給与収入110万円が非課税ライン」と明記されている。
 *
 * 単身・扶養なしの場合、均等割・所得割の非課税限度額はいずれも「35万円×1+10万円=45万円」で
 * 一致する(所得割側の追加加算32万円・均等割側の追加加算21万円は、いずれも同一生計配偶者・
 * 扶養親族がいる場合のみ発生するため、単身では両者に差が生じない。「低い方を採用」という
 * 指示に対しては、両者が同額のため採用する値は一意に決まる)。
 *
 * 級地区分(1〜3級地)により実際の基準額は自治体ごとに異なり、2級地・3級地はこの「基本額」に
 * 0.9・0.8を乗じた額になるため、より基準が厳しい(＝警告対象が狭い)地域も存在する。
 * 本ツールでは、最も基準が緩く警告が出やすい1級地の45万円を、多くの自治体で採用されている
 * 水準の簡易的な目安として採用する(「全国共通」ではない。1級地の45万円より基準が厳しい
 * 2級地・3級地の自治体では、実際にはこの金額より低い年収でも課税されるケースがある)。
 */
export const NON_TAXABLE_SALARY_INCOME_THRESHOLD = 450_000;

export type NonTaxableWarning = {
  mayBeNonTaxable: boolean;
  message: string;
};

const NON_TAXABLE_WARNING_SUFFIX =
  "単身・扶養なしの場合に多くの自治体で採用されている水準(1級地)を簡易的な目安として使用しています。実際の非課税基準はお住まいの自治体(級地区分)・扶養状況により異なります。";

/**
 * 給与所得(給与所得控除後・住民税の基礎控除前の金額)が非課税限度額を下回るかを判定する。
 * 波1・波2共通で使う(指示書の「二重実装しないこと」要件)。
 */
function checkNonTaxable(incomeYen: number): NonTaxableWarning {
  const salaryIncome = calcSalaryIncome(incomeYen);
  const mayBeNonTaxable = salaryIncome <= NON_TAXABLE_SALARY_INCOME_THRESHOLD;
  return {
    mayBeNonTaxable,
    message: mayBeNonTaxable
      ? `給与所得(給与所得控除後の金額)が${(NON_TAXABLE_SALARY_INCOME_THRESHOLD / 10_000).toLocaleString("ja-JP")}万円以下のため、住民税が非課税になる可能性があります。${NON_TAXABLE_WARNING_SUFFIX}`
      : "",
  };
}

/** 年収から、その年の住民税年額(所得割+均等割)を算出する内部ヘルパー。 */
function calcAnnualResidentTax(incomeYen: number): number {
  const taxableIncome = calcTaxableSalaryIncome(incomeYen);
  const { total } = calcResidentTax(taxableIncome);
  return total + PER_CAPITA_TAX;
}

// ============================================================
// データモデル
// ============================================================

export type LumpSumPreference = "lump" | "installment";

export type ResidentTaxTimingInput = {
  /** 退職前年の年収(円、必須・基本入力) */
  priorYearIncome: number;
  /** 退職月(1-12) */
  retirementMonth: number;
  /** 退職後、同一年内の給与収入(円、デフォルト0、任意) */
  postRetirementIncome: number;
  /** 前々年の年収(円、詳細設定・任意。retirementMonthが1-5の時のみ意味を持つ) */
  priorYearIncomeTwoYearsAgo?: number;
  /** 退職年の給与所得の上書き値(円、詳細設定・任意) */
  retirementYearIncomeOverride?: number;
  /** 6-12月退職時のみ有効。デフォルト "installment" */
  lumpSumPreference?: LumpSumPreference;
};

export type CurrentYearTax = {
  /** どちらの所得を基準にしたか */
  incomeBasisYearLabel: "退職前年" | "前々年";
  /** 実際に使った収入額(円、上記どちらか。前々年未入力時はpriorYearIncomeで代用) */
  incomeBasisAmount: number;
  /** 前々年入力がなくpriorYearIncomeで代用した場合true */
  isIncomeBasisEstimated: boolean;
  collectionType: "強制一括徴収" | "通常徴収で完了" | "普通徴収" | "任意一括徴収";
  /** 残額合計(円)。期別の金額配分は一次情報で未確定のため算出しない */
  remainingAmount: number;
  /** UIにそのまま出す注記文 */
  note: string;
  /** 非課税限度額(単身・扶養なし・1級地の簡易基準)を下回る可能性がある場合の警告 */
  nonTaxableWarning: NonTaxableWarning;
  /** collectionTypeが"強制一括徴収"または"任意一括徴収"の場合true(給与・退職金から天引きされる想定)。
   * "普通徴収"または"通常徴収で完了"の場合false。 */
  isWithheldAtSource: boolean;
};

export type NextYearTax = {
  /** 課税所得金額の仮定値(円、給与所得控除・住民税基礎控除を差し引いた後) */
  taxableIncomeAssumption: number;
  isOverridden: boolean;
  /** 給与所得控除額(円、年間ベース、1回のみ適用) */
  incomeTaxDeductionApplied: number;
  /** calcResidentTax()の所得割部分(円) */
  incomeTaxPart: number;
  /** 均等割(円、5,000円/年、固定) */
  perCapitaPart: number;
  total: number;
  /** 非課税限度額(単身・扶養なし・1級地の簡易基準)を下回る可能性がある場合の警告 */
  nonTaxableWarning: NonTaxableWarning;
};

export type ResidentTaxTimingResult = {
  /** currentYearTax.remainingAmount + nextYearTax.total */
  totalCashNeeded: number;
  currentYearTax: CurrentYearTax;
  nextYearTax: NextYearTax;
  assumptionNotes: string[];
};

// ============================================================
// メイン計算関数
// ============================================================

/**
 * 波1(currentYearTax):退職時点で徴収中の住民税年度の残額。
 *
 * 課税年度→所得年→徴収期間モデル(地方税法第321条の5第2項、調査報告書2で確認済み):
 * 退職月Mが6〜12月の場合、徴収中の住民税年度はY年6月開始・Y-1年(退職前年)の所得基準。
 * Mが1〜5月の場合、徴収中の住民税年度は(Y-1)年6月開始・Y-2年(前々年)の所得基準。
 *
 * 残り月数(=退職月から住民税年度末の5月までの月数)は、退職月グループによって
 * 退職月自体を含むかどうかが異なる(調査報告書2の実例と一致させた、2026-08セッションで確定):
 *   1〜4月退職: 6 - retirementMonth  (退職月を含む。最後の給与処理が間に合わないため)
 *   5月退職:    0                    (最後の1ヶ月分は通常通り天引きされて完了)
 *   6〜12月退職: 17 - retirementMonth (退職月は含まない。退職月分は既に天引き済みのため)
 */
function calcCurrentYearTax(input: ResidentTaxTimingInput, assumptionNotes: string[]): CurrentYearTax {
  const { priorYearIncome, retirementMonth, priorYearIncomeTwoYearsAgo, lumpSumPreference = "installment" } = input;

  const usesTwoYearsAgo = retirementMonth <= 5;
  const isIncomeBasisEstimated = usesTwoYearsAgo && priorYearIncomeTwoYearsAgo === undefined;
  const incomeBasisAmount = usesTwoYearsAgo
    ? priorYearIncomeTwoYearsAgo ?? priorYearIncome
    : priorYearIncome;
  const incomeBasisYearLabel: CurrentYearTax["incomeBasisYearLabel"] = usesTwoYearsAgo ? "前々年" : "退職前年";

  if (isIncomeBasisEstimated) {
    assumptionNotes.push("前々年の所得が未入力のため、退職前年の年収で代用しています");
  }

  const annualTax = calcAnnualResidentTax(incomeBasisAmount);
  const nonTaxableWarning = checkNonTaxable(incomeBasisAmount);
  const deductionNote = salaryDeductionApproxNote("今の住民税の残り", incomeBasisAmount);
  if (deductionNote) assumptionNotes.push(deductionNote);

  let collectionType: CurrentYearTax["collectionType"];
  let remainingMonths: number;
  let note: string;

  if (retirementMonth >= 1 && retirementMonth <= 4) {
    collectionType = "強制一括徴収";
    remainingMonths = 6 - retirementMonth;
    note =
      "退職時の給与・退職金から残りの住民税がまとめて天引きされます(地方税法第321条の5第2項、本人の意思にかかわらず強制)。給与・退職金の額が残税額に満たない場合、不足分は普通徴収に切り替わります。";
  } else if (retirementMonth === 5) {
    collectionType = "通常徴収で完了";
    remainingMonths = 0;
    note = "5月分のみが残っている状態のため、最後の給与から通常通り天引きされて完了します。新たな徴収は発生しません。";
  } else {
    remainingMonths = 17 - retirementMonth;
    if (lumpSumPreference === "lump") {
      collectionType = "任意一括徴収";
      note =
        "ご本人の申出により、退職時の給与・退職金からまとめて天引きされる場合の金額です(原則として、本人の申出がなければ一括徴収されません)。給与・退職金の額が残税額に満たない場合、不足分は普通徴収に切り替わります。";
    } else {
      collectionType = "普通徴収";
      note = "実際の納付回数・時期は自治体により異なります。目安として残額の合計を表示しています。";
    }
  }

  const remainingAmount = Math.floor((annualTax * remainingMonths) / 12 + 1e-6);
  const isWithheldAtSource = collectionType === "強制一括徴収" || collectionType === "任意一括徴収";

  return {
    incomeBasisYearLabel, incomeBasisAmount, isIncomeBasisEstimated, collectionType, remainingAmount, note,
    nonTaxableWarning, isWithheldAtSource,
  };
}

/**
 * 波2(nextYearTax):退職年の所得を基準にした、翌年6月開始の新規課税。
 * 退職月によらず、常に「退職年の所得」を基準にする(波1のような分岐はない)。
 */
function calcNextYearTax(input: ResidentTaxTimingInput, assumptionNotes: string[]): NextYearTax {
  const { priorYearIncome, retirementMonth, postRetirementIncome, retirementYearIncomeOverride } = input;

  const estimatedRetirementYearIncome = (priorYearIncome / 12) * retirementMonth + postRetirementIncome;
  const isOverridden = retirementYearIncomeOverride !== undefined;
  const retirementYearIncome = retirementYearIncomeOverride ?? estimatedRetirementYearIncome;

  if (!isOverridden) {
    assumptionNotes.push(
      "退職前の給与は前年の年収を月割りした仮定値です。賞与の時期により実際の所得とは差が生じます。"
    );
  }

  if (postRetirementIncome > 0) {
    assumptionNotes.push(
      "退職翌年6月からの新規課税は、自己納付(普通徴収)を前提に試算しています。退職後の勤務先で特別徴収が設定されている場合は、給与天引きになることがあります。"
    );
  }

  const deductionNote = salaryDeductionApproxNote("退職翌年の新規課税", retirementYearIncome);
  if (deductionNote) assumptionNotes.push(deductionNote);

  const incomeTaxDeductionApplied = calcSalaryIncomeDeduction(retirementYearIncome);
  const taxableIncomeAssumption = calcTaxableSalaryIncome(retirementYearIncome);
  const { total: incomeTaxPart } = calcResidentTax(taxableIncomeAssumption);
  const perCapitaPart = PER_CAPITA_TAX;
  const nonTaxableWarning = checkNonTaxable(retirementYearIncome);

  return {
    taxableIncomeAssumption,
    isOverridden,
    incomeTaxDeductionApplied,
    incomeTaxPart,
    perCapitaPart,
    total: incomeTaxPart + perCapitaPart,
    nonTaxableWarning,
  };
}

export function calcResidentTaxTiming(input: ResidentTaxTimingInput): ResidentTaxTimingResult {
  const assumptionNotes: string[] = [];
  const currentYearTax = calcCurrentYearTax(input, assumptionNotes);
  const nextYearTax = calcNextYearTax(input, assumptionNotes);

  return {
    totalCashNeeded: currentYearTax.remainingAmount + nextYearTax.total,
    currentYearTax,
    nextYearTax,
    assumptionNotes,
  };
}
