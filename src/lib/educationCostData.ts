/**
 * 教育費シミュレーター向けの統計データ定義。
 * financeCore.ts/pensionCore.tsとは性質が異なる（複利計算ではなく統計値の参照・積み上げ）ため、
 * 別ファイルに分離した（product_spec_education_cost_tool.md 6章）。
 * simulate.ts/analyze.tsには一切依存しない。
 *
 * 単位は他の計算エンジン（financeCore.ts等）の「万円」ではなく「円」。
 * 文部科学省・日本政策金融公庫の統計値をそのまま保持するため（implementation_education_cost_phase1.md 1章）。
 */

export type SchoolStage = 'kindergarten' | 'elementary' | 'juniorHigh' | 'highSchool' | 'university';

export const SCHOOL_STAGES: SchoolStage[] = ['kindergarten', 'elementary', 'juniorHigh', 'highSchool', 'university'];

/** 各ステージの標準的な就学年数。留年・浪人等は考慮しない（Spec 6章）。 */
export const STAGE_DURATION_YEARS: Record<SchoolStage, number> = {
  kindergarten: 3,
  elementary: 6,
  juniorHigh: 3,
  highSchool: 3,
  university: 4,
};

export type PublicPrivate = 'public' | 'private';

/**
 * 幼稚園〜高校の年額（円）。
 * 出典: 文部科学省「令和5年度子供の学習費調査」。学校教育費+学校外活動費の合計、
 * 学校給食費は除外（Spec 6章・除外理由参照）。
 */
export const PRE_UNIVERSITY_ANNUAL_COST: Record<Exclude<SchoolStage, 'university'>, Record<PublicPrivate, number>> = {
  kindergarten: { public: 169_411, private: 311_597 },
  elementary:   { public: 297_860, private: 1_774_511 },
  juniorHigh:   { public: 506_808, private: 1_551_042 },
  highSchool:   { public: 597_752, private: 1_030_283 },
};

export type UniversityTrack = 'national' | 'privateArts' | 'privateScience';

export interface UniversityCost {
  /** 入学費用（円）。初年度に一括計上する（Spec 6章の例外規定）。 */
  entranceCost: number;
  /** 在学費用（円/年）。4年間均等按分（=年額をそのまま4年間繰り返す）。 */
  annualCost: number;
}

/**
 * 大学の入学費用・在学費用（円）。
 * 出典: 日本政策金融公庫「令和3年度教育費負担の実態調査結果」（2026-07-30時点、これより新しい
 * 調査は公表されていないことをWeb検索で確認済み。implementation_education_cost_phase1.md 4章）。
 */
export const UNIVERSITY_COST: Record<UniversityTrack, UniversityCost> = {
  national:       { entranceCost: 672_000, annualCost: 1_035_000 },
  privateArts:    { entranceCost: 818_000, annualCost: 1_520_000 },
  privateScience: { entranceCost: 888_000, annualCost: 1_832_000 },
};

/**
 * 仕送り（一人暮らし時、大学ステージのみのオプトイン）プリセット初期値（円/年）。
 * 出典: 日本政策金融公庫「令和3年度教育費負担の実態調査結果」自宅外通学者データ（月換算 約8万円）。
 */
export const REMITTANCE_PRESET_ANNUAL = 958_000;

/** v1で対応する子供の人数の上限（Spec 3章）。 */
export const MAX_CHILDREN = 3;
