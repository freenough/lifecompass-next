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

/**
 * 退職月が1〜5月かどうか(波1が前々年基準・波2が退職前年基準になる、住民税の徴収サイクル上の
 * グループ)を判定する共通ヘルパー。`calcCurrentYearTax()`の`usesTwoYearsAgo`・
 * `calcNextYearTax()`の所得基準分岐・UI側(`ResidentTaxTimingResult.tsx`・
 * `ResidentTaxTimingTool.tsx`)の文言出し分けが、いずれもこの同一の条件
 * (`retirementMonth <= 5`)を参照する。判定ロジックが複数箇所に別々に書かれることを避けるため、
 * ここに集約する(impl_resident_tax_timing_intro_and_age_note.md)。
 */
export function isEarlyYearRetirement(retirementMonth: number): boolean {
  return retirementMonth <= 5;
}

// ============================================================
// 収入 → 課税所得の変換(波1・波2で共通)
// ============================================================

/**
 * 給与所得控除額を計算する。所得税法上の給与所得控除は「その収入を得た年(暦年)」の制度が
 * 適用されるため、incomeYear(西暦・暦年)によって参照するテーブルを切り替える。
 *
 * ## 令和7年分以前(incomeYear <= 2025):65万円ベース(既存)
 * 出典: 国税庁 No.1410 給与所得控除 https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *       国税庁「令和7年度税制改正による所得税の基礎控除の見直し等について」
 *       https://www.nta.go.jp/users/gensen/2025kiso/index.htm
 *
 * ## 令和8年分・令和9年分(incomeYear === 2026 または 2027):74万円ベースの時限特例
 * 出典: 国税庁「令和8年度税制改正(所得税の基礎控除の引上げ等関係)Q&A」(令和8年5月付)
 *       https://www.nta.go.jp/users/gensen/2026kiso/pdf/0026005-024.pdf (Q3-1①の表)
 * 上記Q&Aで確認した「その給与に係る給与所得の金額」の表(69万1,000円以上220万円未満の区分):
 *   69万1,000円以上74万1,000円未満: なし(=0円)
 *   74万1,000円以上219万1,000円未満: 収入金額-74万円
 *   219万1,000円以上219万3,000円未満: 145万1,000円(固定)
 *   219万3,000円以上219万6,000円未満: 145万3,000円(固定)
 *   219万6,000円以上220万円未満: 145万6,000円(固定)
 *   220万円以上: 従来の速算表と同一(×30%+8万円等。219万1,000円までの「収入-74万円」は
 *     deduction=740,000一定と等価であり、69万1,000円未満(Q&Aに記載なし)についても
 *     deduction≥incomeとなるため所得は0に floor される。219万1,000円〜220万円は、
 *     「収入-74万円」の連続式(220万円で×30%+8万円と一致=74万円)と実際の速算式との間に
 *     生じる僅かな差を埋めるための、別表第五と同様のステップ(狭い区分での固定値)。
 *     このステップ区分だけは近似せず、Q&Aの数値をそのまま実装する。
 *
 * ## 令和10年分(2028年)以降(incomeYear >= 2028):**未確定・保守的な近似**
 * 69万円が恒久的な最低保障額になることは確認済みだが、フラット部分の正確な上限額
 * (200万円台のどこか)は本セッションで一次情報の裏付けが取れていない
 * (docs/fixes/active/investigation_kyuyo_koujo_reiwa8_taiou_report.mdの禁止事項により、
 * 未確認の「204万円」等の数値はコードに書き込まない)。暫定措置として、上限額は
 * 令和7年度版と同じ190万円のまま据え置く(190万円時点で69万円→650,000円台の速算式へ
 * 不連続に落ちる近似だが、安全側〈=控除をやや少なめに見積もる〉に倒れる)。
 * **一次情報が確認でき次第、正確な境界値に修正すること。**
 */
export function calcSalaryIncomeDeduction(incomeYen: number, incomeYear: number): number {
  if (incomeYear <= 2025) {
    if (incomeYen <= 1_900_000) return 650_000;
    return calcSalaryIncomeDeductionUpperBrackets(incomeYen);
  }
  if (incomeYear === 2026 || incomeYear === 2027) {
    // 74万1,000円未満(69万1,000円以上の「なし」区分含む)は所得0円ちょうど、
    // すなわち控除額=収入金額そのもの(74万円固定ではない)。74万円固定にすると
    // 収入74万〜74万999円の間だけ所得が1〜999円の端数で漏れ出てしまうため注意。
    if (incomeYen < 741_000) return incomeYen;
    if (incomeYen < 2_191_000) return 740_000;
    if (incomeYen < 2_193_000) return incomeYen - 1_451_000;
    if (incomeYen < 2_196_000) return incomeYen - 1_453_000;
    if (incomeYen < 2_200_000) return incomeYen - 1_456_000;
    return calcSalaryIncomeDeductionUpperBrackets(incomeYen);
  }
  // 令和10年分以降:上限額190万円は未確認のための暫定近似(上記コメント参照)
  if (incomeYen <= 1_900_000) return 690_000;
  return calcSalaryIncomeDeductionUpperBrackets(incomeYen);
}

/** 220万円(または190万円)超〜850万円超の速算表。全時代・全年分で共通(変更なしと確認済み)。 */
function calcSalaryIncomeDeductionUpperBrackets(incomeYen: number): number {
  if (incomeYen <= 3_600_000) return Math.floor(incomeYen * 0.3 + 80_000 + 1e-6);
  if (incomeYen <= 6_600_000) return Math.floor(incomeYen * 0.2 + 440_000 + 1e-6);
  if (incomeYen <= 8_500_000) return Math.floor(incomeYen * 0.1 + 1_100_000 + 1e-6);
  return 1_950_000;
}

/**
 * calcSalaryIncomeDeduction()の速算表近似が生む、所得税法別表第五との誤差の上限(円)。
 * **令和7年分(incomeYear<=2025)のみ検証済み**(e-Gov法令API v2で取得した所得税法別表第五との
 * 8点照合、docs/fixes/active/betsuhyo5-extraction/investigation_report.md参照)。
 * 令和8年分以降は別表第五との照合を行っていないため、誤差の上限は不明。呼び出し側
 * (salaryDeductionApproxNote())はnullの場合「誤差未検証」の注記に切り替えること。
 */
export function calcSalaryDeductionApproxMaxError(incomeYen: number, incomeYear: number): number | null {
  if (incomeYear > 2025) return null;
  if (incomeYen <= 1_900_000) return 0;
  if (incomeYen <= 3_600_000) return 1_200;
  if (incomeYen <= 6_600_000) return 800;
  if (incomeYen <= 8_500_000) return 400;
  return 0;
}

/** 年収から給与所得(給与所得控除後・住民税の基礎控除前の金額)を算出する。非課税判定にも使う。
 * 社会保険料控除は含めない(非課税限度額の判定基準である「合計所得金額」は、社会保険料控除等の
 * 所得控除を差し引く前の金額のため)。 */
function calcSalaryIncome(incomeYen: number, incomeYear: number): number {
  return Math.max(0, incomeYen - calcSalaryIncomeDeduction(incomeYen, incomeYear));
}

/**
 * 社会保険料控除の概算額(円)を算出する(標準ケース:年収×概算料率)。
 * 出典: 日本年金機構(厚生年金保険料率18.3%を労使折半→本人負担9.15%)
 *       https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html
 *       全国健康保険協会(協会けんぽ令和8年度 全国平均保険料率9.9%を労使折半→本人負担4.95%)
 *       https://www.kyoukaikenpo.or.jp/lp/2026hokenryou/
 *       全国健康保険協会(介護保険料率、令和8年3月分以降1.62%を労使折半→本人負担0.81%)
 *       https://www.kyoukaikenpo.or.jp/about/business/insurance_rate/002/index.html
 *       厚生労働省(雇用保険料率、令和8年度・一般の事業・労働者負担分5/1,000=0.5%)
 *       https://www.mhlw.go.jp/content/001692566.pdf
 * 概算料率(標準報酬月額の上限・賞与の別建て計算等は考慮しない簡易近似。
 * docs/fixes/active/investigation_shakai_hoken_kojo_report.mdで、本ツールの想定年収帯
 * 〈400〜800万円〉ではこの近似による誤差が実用上小さいことを確認済み):
 *   40歳未満: 9.15%+4.95%+0.5%=14.6%
 *   40歳以上65歳未満: 上記+介護保険0.81%=15.4%
 */
export const SOCIAL_INSURANCE_RATE_UNDER_40 = 14.6;
export const SOCIAL_INSURANCE_RATE_40_OR_OVER = 15.4;

export function calcSocialInsuranceDeduction(incomeYen: number, ratePercent: number): number {
  return Math.max(0, Math.floor(incomeYen * (ratePercent / 100) + 1e-6));
}

/**
 * 年収から住民税の課税所得金額を算出する共通変換関数(波1・波2の両方がこれを経由する)。
 * 年収 → 給与所得控除を差し引き → 社会保険料控除(年収×概算料率、または上書き値)を差し引き →
 * 住民税の基礎控除(原則43万円、src/lib/tax/ideco.ts の RESIDENT_TAX_BASIC_DEDUCTION を
 * 再利用。新規定数は作らない)を差し引き「課税所得」、という一連の変換。指示書の方針通り、
 * 各ステップでは個別に0円未満をクランプせず、最終的な課税所得の算出時に1回だけクランプする。
 */
export function calcTaxableSalaryIncome(incomeYen: number, incomeYear: number, socialInsuranceRatePercent: number): number {
  const salaryDeduction = calcSalaryIncomeDeduction(incomeYen, incomeYear);
  const socialInsuranceDeduction = calcSocialInsuranceDeduction(incomeYen, socialInsuranceRatePercent);
  return Math.max(0, incomeYen - salaryDeduction - socialInsuranceDeduction - RESIDENT_TAX_BASIC_DEDUCTION);
}

/**
 * 給与所得控除の速算表近似について、収入が属する区分に応じた誤差上限の注記文を返す
 * (差がない区分ではnullを返し、UIに出さない)。令和8年分以降は誤差自体が未検証のため、
 * 具体的な金額を示さず「未検証」の注記に切り替える。
 */
function salaryDeductionApproxNote(waveLabel: string, incomeYen: number, incomeYear: number): string | null {
  const maxError = calcSalaryDeductionApproxMaxError(incomeYen, incomeYear);
  if (maxError === null) {
    return `${waveLabel}の給与所得控除額は、${incomeYear}年分の税制(令和8年度税制改正による特例テーブル)を使用しています。所得税法別表第五との誤差は令和7年分のテーブルのみ検証済みで、この年分については未検証です。`;
  }
  if (maxError === 0) return null;
  return `${waveLabel}の給与所得控除額は、所得税法別表第五(4,000円刻みの区分表)との間で、収入が属する区分に応じて最大${maxError.toLocaleString("ja-JP")}円程度の差が生じる場合があります(この差は区分ごとに一意に決まるものであり、ランダムに変動するものではありません)。`;
}

// ============================================================
// 調整控除(所得税・住民税の人的控除差を調整する税額控除)
// ============================================================

/**
 * 調整控除額を計算する。所得税と住民税で人的控除(基礎控除・扶養控除等)の金額に差があることに
 * 伴う税負担増を調整するための税額控除で、calcResidentTax()が返す所得割額から差し引く
 * (calcResidentTax()本体は無改修。呼び出し側でこの関数の結果を差し引く方式)。
 *
 * 本ツールは独身・扶養なし前提のため、「人的控除額の差の合計額」は基礎控除の差のみ=5万円で
 * 固定される(所得税側の基礎控除が令和7年度・令和8年度改正でいくらに変動しても、調整控除の
 * 計算に用いる差額自体は5万円のまま、と複数の自治体公式ページで確認済み。
 * docs/fixes/active/investigation_shakai_hoken_kojo_report.md参照)。
 *
 * 出典(算定式): 諏訪市「人的控除の差と調整控除の計算方法」https://www.city.suwa.lg.jp/soshiki/4/4918.html
 *               京都市「調整控除」https://www.city.kyoto.lg.jp/gyozai/page/0000028147.html
 * - 課税所得金額が200万円以下: min(人的控除額の差の合計額, 課税所得金額) × 5%
 * - 課税所得金額が200万円超: {人的控除額の差の合計額 - (課税所得金額-200万円)} × 5%。
 *   ただし計算結果が2,500円を下回る場合(マイナスになる場合を含む)は2,500円とする。
 *
 * 【前回調査報告書(investigation_shakai_hoken_kojo_report.md)からの訂正】同報告書では
 * 「課税所得金額が205万円超で調整控除0円」としていたが、これは誤りだった。諏訪市公式ページで
 * 「計算結果が2,500円未満のときは2,500円」「計算結果がマイナスの場合も2,500円が適用される」
 * ことを実例付きで確認したため訂正する。**調整控除は、合計所得金額が2,500万円を超えない限り、
 * 課税所得金額がどれだけ高くても消滅しない(常に少なくとも2,500円)。**
 * (合計所得金額2,500万円超で調整控除自体が不適用になるケースは、本ツールの想定年収帯
 * 〈400〜800万円〉では通常発生しないため、本ツールでは考慮しない)
 */
const ADJUSTMENT_DEDUCTION_PERSONAL_DIFF = 50_000;
const ADJUSTMENT_DEDUCTION_FLOOR = 2_500;

export function calcAdjustmentDeduction(taxableIncome: number): number {
  if (taxableIncome <= 2_000_000) {
    return Math.floor(Math.min(ADJUSTMENT_DEDUCTION_PERSONAL_DIFF, taxableIncome) * 0.05 + 1e-6);
  }
  const raw = (ADJUSTMENT_DEDUCTION_PERSONAL_DIFF - (taxableIncome - 2_000_000)) * 0.05;
  return Math.max(ADJUSTMENT_DEDUCTION_FLOOR, Math.floor(raw + 1e-6));
}

/**
 * calcResidentTax()の所得割額から調整控除を差し引いた、実際に課税される所得割額を返す。
 * 波1(calcAnnualResidentTax内)・波2(calcNextYearTax内)の両方がこれを呼ぶ(二重実装しない)。
 */
function calcIncomeTaxPartWithAdjustment(taxableIncome: number): number {
  const { total } = calcResidentTax(taxableIncome);
  const adjustment = calcAdjustmentDeduction(taxableIncome);
  return Math.max(0, total - adjustment);
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
function checkNonTaxable(incomeYen: number, incomeYear: number): NonTaxableWarning {
  const salaryIncome = calcSalaryIncome(incomeYen, incomeYear);
  const mayBeNonTaxable = salaryIncome <= NON_TAXABLE_SALARY_INCOME_THRESHOLD;
  return {
    mayBeNonTaxable,
    message: mayBeNonTaxable
      ? `給与所得(給与所得控除後の金額)が${(NON_TAXABLE_SALARY_INCOME_THRESHOLD / 10_000).toLocaleString("ja-JP")}万円以下のため、住民税が非課税になる可能性があります。${NON_TAXABLE_WARNING_SUFFIX}`
      : "",
  };
}

type AnnualResidentTaxBreakdown = {
  annualTax: number;
  socialInsuranceDeductionApplied: number;
  adjustmentDeductionApplied: number;
};

/** 年収から、その年の住民税年額(所得割+均等割、調整控除差引後)と内訳を算出する内部ヘルパー。 */
function calcAnnualResidentTax(incomeYen: number, incomeYear: number, socialInsuranceRatePercent: number): AnnualResidentTaxBreakdown {
  const taxableIncome = calcTaxableSalaryIncome(incomeYen, incomeYear, socialInsuranceRatePercent);
  const incomeTaxPart = calcIncomeTaxPartWithAdjustment(taxableIncome);
  return {
    annualTax: incomeTaxPart + PER_CAPITA_TAX,
    socialInsuranceDeductionApplied: calcSocialInsuranceDeduction(incomeYen, socialInsuranceRatePercent),
    adjustmentDeductionApplied: calcAdjustmentDeduction(taxableIncome),
  };
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
  /** 40歳以上65歳未満か(介護保険料を社会保険料控除の概算料率に含めるかどうか)。デフォルトfalse */
  isAge40OrOver?: boolean;
  /** 社会保険料率の上書き(%単位、例:14.6)。詳細設定・任意。指定時は概算料率より優先 */
  socialInsuranceRateOverride?: number;
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
  /** 社会保険料控除額(円、年額ベース。annualTax算出前の課税所得計算に使った金額) */
  socialInsuranceDeductionApplied: number;
  /** 調整控除額(円、annualTax算出前の年間税額から差し引いた金額) */
  adjustmentDeductionApplied: number;
};

export type NextYearTax = {
  /** 課税所得金額の仮定値(円、給与所得控除・社会保険料控除・住民税基礎控除を差し引いた後) */
  taxableIncomeAssumption: number;
  isOverridden: boolean;
  /** 給与所得控除額(円、年間ベース、1回のみ適用) */
  incomeTaxDeductionApplied: number;
  /** 社会保険料控除額(円、年間ベース、1回のみ適用) */
  socialInsuranceDeductionApplied: number;
  /** 調整控除額(円、所得割から差し引いた金額) */
  adjustmentDeductionApplied: number;
  /** calcResidentTax()の所得割部分(円、調整控除差引後) */
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
  /** 退職年(西暦)。new Date().getFullYear()で算出した「今年」(UIでの前提条件の開示に使う) */
  retirementYear: number;
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
 *
 * @param retirementYear 退職年(西暦)。calcResidentTaxTiming()が`new Date().getFullYear()`で
 *   決定した「今年」をそのまま渡す(本ツールは常に「今」使われる前提)。
 *   incomeBasisYearLabelが「退職前年」ならretirementYear-1、「前々年」ならretirementYear-2の
 *   給与所得控除テーブルを参照する。
 * @param socialInsuranceRatePercent 社会保険料控除の概算料率(%)。波1・波2で同じ値を使う。
 */
function calcCurrentYearTax(
  input: ResidentTaxTimingInput, assumptionNotes: string[], retirementYear: number, socialInsuranceRatePercent: number,
): CurrentYearTax {
  const { priorYearIncome, retirementMonth, priorYearIncomeTwoYearsAgo, lumpSumPreference = "installment" } = input;

  const usesTwoYearsAgo = isEarlyYearRetirement(retirementMonth);
  const isIncomeBasisEstimated = usesTwoYearsAgo && priorYearIncomeTwoYearsAgo === undefined;
  const incomeBasisAmount = usesTwoYearsAgo
    ? priorYearIncomeTwoYearsAgo ?? priorYearIncome
    : priorYearIncome;
  const incomeBasisYearLabel: CurrentYearTax["incomeBasisYearLabel"] = usesTwoYearsAgo ? "前々年" : "退職前年";
  const incomeYear = usesTwoYearsAgo ? retirementYear - 2 : retirementYear - 1;

  if (isIncomeBasisEstimated) {
    assumptionNotes.push("前々年の所得が未入力のため、退職前年の年収で代用しています");
  }

  const { annualTax, socialInsuranceDeductionApplied, adjustmentDeductionApplied } =
    calcAnnualResidentTax(incomeBasisAmount, incomeYear, socialInsuranceRatePercent);
  const nonTaxableWarning = checkNonTaxable(incomeBasisAmount, incomeYear);
  const deductionNote = salaryDeductionApproxNote("今の住民税の残り", incomeBasisAmount, incomeYear);
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
    nonTaxableWarning, isWithheldAtSource, socialInsuranceDeductionApplied, adjustmentDeductionApplied,
  };
}

/**
 * 波2(nextYearTax):進行中の住民税年度(波1)の直後に始まる、新規課税。
 *
 * 退職月によって所得基準・開始時期が異なる(docs/fixes/active/investigation_wave2_1to5gatsu_taisho_report.md
 * で確認済みの設計。地方税法上、個人住民税は「前年(1〜12月)の所得を基準に、その年6月〜翌年5月」
 * 課税されるという1年周期の規則性を、波1の直後のサイクルにそのまま適用しただけ):
 * - **6〜12月退職**:退職した年(Y)自体が部分所得(1月〜退職月+退職後収入)になるケース。
 *   翌年(Y+1)6月開始、所得基準=退職年(Y)の部分所得(月割り推計)。
 * - **1〜5月退職**:退職者は前年(Y-1)を通じて年間在職していたため、前年(Y-1)の所得は
 *   確定した1年分(`priorYearIncome`そのもの、月割りしない)。今年(Y)6月開始、
 *   所得基準=前年(Y-1)のまるまる1年分。`postRetirementIncome`(退職後の同一年内収入)は
 *   Y年の所得であり前年の所得には含まれないため、この分岐では加算しない
 *   (2026-08セッションで修正:修正前はこの分岐がなく、1〜5月退職でも6〜12月退職と同じ
 *   月割り推計式が誤って使われていた。本来最優先で表示すべき「前年まるまる1年分基準」の
 *   新規課税が一切計算されず、代わりに実質「波3」〈退職年の部分所得を基準にした、さらに先の
 *   新規課税〉に相当する小さい金額が②として表示されていた。詳細は上記調査報告書参照)。
 *
 * @param retirementYear 退職年(西暦)。calcResidentTaxTiming()が`new Date().getFullYear()`で
 *   決定した「今年」をそのまま渡す。
 * @param socialInsuranceRatePercent 社会保険料控除の概算料率(%)。波1・波2で同じ値を使う。
 */
function calcNextYearTax(
  input: ResidentTaxTimingInput, assumptionNotes: string[], retirementYear: number, socialInsuranceRatePercent: number,
): NextYearTax {
  const { priorYearIncome, retirementMonth, postRetirementIncome, retirementYearIncomeOverride } = input;

  const earlyYearRetirement = isEarlyYearRetirement(retirementMonth);
  const incomeYear = earlyYearRetirement ? retirementYear - 1 : retirementYear;
  const estimatedRetirementYearIncome = earlyYearRetirement
    ? priorYearIncome
    : (priorYearIncome / 12) * retirementMonth + postRetirementIncome;
  // retirementYearIncomeOverride(「退職年の実際の給与収入」の上書き)は、1〜5月退職では
  // 波2の所得基準が「退職年」ではなく「退職前年(priorYearIncome)」に変わるため意味を持たない。
  // UI側(ResidentTaxTimingForm.tsx)は1〜5月退職時にこの入力欄自体を非表示にしているが、
  // 計算側でも二重に防御し、渡された値があっても明示的に無視する
  // (docs/fixes/active/impl_resident_tax_timing_override_hide.md)。
  const isOverridden = !earlyYearRetirement && retirementYearIncomeOverride !== undefined;
  const retirementYearIncome = (!earlyYearRetirement && retirementYearIncomeOverride !== undefined)
    ? retirementYearIncomeOverride
    : estimatedRetirementYearIncome;

  if (!isOverridden) {
    assumptionNotes.push(
      earlyYearRetirement
        ? "今年6月からの新規課税は、退職前年の年収をそのまま使用しています(退職月が1〜5月のため、前年は年間を通じて在職していたと仮定しています)。"
        : "退職前の給与は前年の年収を月割りした仮定値です。賞与の時期により実際の所得とは差が生じます。"
    );
  }

  if (postRetirementIncome > 0 && !earlyYearRetirement) {
    assumptionNotes.push(
      "退職翌年6月からの新規課税は、自己納付(普通徴収)を前提に試算しています。退職後の勤務先で特別徴収が設定されている場合は、給与天引きになることがあります。"
    );
  }

  const deductionNote = salaryDeductionApproxNote(
    earlyYearRetirement ? "今年6月からの新規課税" : "退職翌年の新規課税",
    retirementYearIncome, incomeYear,
  );
  if (deductionNote) assumptionNotes.push(deductionNote);

  const incomeTaxDeductionApplied = calcSalaryIncomeDeduction(retirementYearIncome, incomeYear);
  const socialInsuranceDeductionApplied = calcSocialInsuranceDeduction(retirementYearIncome, socialInsuranceRatePercent);
  const taxableIncomeAssumption = calcTaxableSalaryIncome(retirementYearIncome, incomeYear, socialInsuranceRatePercent);
  const adjustmentDeductionApplied = calcAdjustmentDeduction(taxableIncomeAssumption);
  const incomeTaxPart = calcIncomeTaxPartWithAdjustment(taxableIncomeAssumption);
  const perCapitaPart = PER_CAPITA_TAX;
  const nonTaxableWarning = checkNonTaxable(retirementYearIncome, incomeYear);

  return {
    taxableIncomeAssumption,
    isOverridden,
    incomeTaxDeductionApplied,
    socialInsuranceDeductionApplied,
    adjustmentDeductionApplied,
    incomeTaxPart,
    perCapitaPart,
    total: incomeTaxPart + perCapitaPart,
    nonTaxableWarning,
  };
}

export function calcResidentTaxTiming(input: ResidentTaxTimingInput): ResidentTaxTimingResult {
  // 本ツールは常に「今」使われる前提のため、実行時点の西暦年を「退職年」とみなす
  // (指示書で確認済みの設計方針。ユーザーに西暦年の入力は求めない)。
  const retirementYear = new Date().getFullYear();
  const socialInsuranceRatePercent = input.socialInsuranceRateOverride ??
    (input.isAge40OrOver ? SOCIAL_INSURANCE_RATE_40_OR_OVER : SOCIAL_INSURANCE_RATE_UNDER_40);
  const assumptionNotes: string[] = [];

  // 40歳以上65歳未満の設定(介護保険料込みの料率)は、波1(1〜2年前の所得基準)・波2
  // (退職年または退職前年の所得基準)の両方に一律で適用される簡易試算である旨の注記。
  // 「40歳未満」(デフォルト)の場合はこの注記を出さない:年齢は単調に増加するため、
  // 「現在40歳未満」ならば1〜2年前の時点でも必ず40歳未満だったことになり、簡略化による
  // 誤差は理論上生じ得ない。一方「40歳以上」の場合は、直近で40歳に到達したばかりの
  // ケースなど、1〜2年前は40歳未満だった可能性があるため、一律適用による誤差が生じ得る
  // (impl_resident_tax_timing_intro_and_age_note.md)。socialInsuranceRateOverride指定時は
  // 年齢由来の料率選択自体が行われていないため、この注記の対象外とする。
  if (input.isAge40OrOver && input.socialInsuranceRateOverride === undefined) {
    assumptionNotes.push(
      "社会保険料率(40歳以上65歳未満の設定)は、波1・波2のいずれにも同じ料率を一律に適用した簡易試算です。実際は、それぞれの所得を得た時点(1〜2年前と退職時点)での年齢によって異なる場合があります。"
    );
  }

  const currentYearTax = calcCurrentYearTax(input, assumptionNotes, retirementYear, socialInsuranceRatePercent);
  const nextYearTax = calcNextYearTax(input, assumptionNotes, retirementYear, socialInsuranceRatePercent);

  return {
    totalCashNeeded: currentYearTax.remainingAmount + nextYearTax.total,
    currentYearTax,
    nextYearTax,
    assumptionNotes,
    retirementYear,
  };
}
