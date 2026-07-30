/**
 * 教育費シミュレーター向けの計算エンジン。
 * educationCostData.ts（統計データ）を参照して、子供ごとの現在の学年から
 * 大学卒業までの年次費用を積み上げる。simulate.ts/analyze.ts/financeCore.tsには
 * 一切依存しない独立した純粋関数群（product_spec_education_cost_tool.md 6章）。
 */

import {
  SCHOOL_STAGES,
  STAGE_DURATION_YEARS,
  PRE_UNIVERSITY_ANNUAL_COST,
  UNIVERSITY_COST,
  REMITTANCE_PRESET_ANNUAL,
  type SchoolStage,
  type PublicPrivate,
  type UniversityTrack,
} from './educationCostData';

/**
 * 現在の学年。年齢からの逆算をユーザーに求めないための直接選択方式（Spec 4章）。
 * 'preK'（未就学児）を選ぶと、幼稚園3年をこの年（年次配列のindex 0）から満年数で計算する
 * （「幼稚園に上がる前の空白年」は設けない。就学猶予等の考慮は本ツールのスコープ外）。
 */
export type Grade =
  | 'preK'
  | 'kinder1' | 'kinder2' | 'kinder3'
  | 'elem1' | 'elem2' | 'elem3' | 'elem4' | 'elem5' | 'elem6'
  | 'jhs1' | 'jhs2' | 'jhs3'
  | 'hs1' | 'hs2' | 'hs3'
  | 'univ1' | 'univ2' | 'univ3' | 'univ4';

interface GradePosition {
  stageIndex: number;
  /** そのステージ内での学年（1始まり）。例: 小3なら3。 */
  yearWithinStage: number;
}

const GRADE_POSITIONS: Record<Exclude<Grade, 'preK'>, GradePosition> = {
  kinder1: { stageIndex: 0, yearWithinStage: 1 },
  kinder2: { stageIndex: 0, yearWithinStage: 2 },
  kinder3: { stageIndex: 0, yearWithinStage: 3 },
  elem1: { stageIndex: 1, yearWithinStage: 1 },
  elem2: { stageIndex: 1, yearWithinStage: 2 },
  elem3: { stageIndex: 1, yearWithinStage: 3 },
  elem4: { stageIndex: 1, yearWithinStage: 4 },
  elem5: { stageIndex: 1, yearWithinStage: 5 },
  elem6: { stageIndex: 1, yearWithinStage: 6 },
  jhs1: { stageIndex: 2, yearWithinStage: 1 },
  jhs2: { stageIndex: 2, yearWithinStage: 2 },
  jhs3: { stageIndex: 2, yearWithinStage: 3 },
  hs1: { stageIndex: 3, yearWithinStage: 1 },
  hs2: { stageIndex: 3, yearWithinStage: 2 },
  hs3: { stageIndex: 3, yearWithinStage: 3 },
  univ1: { stageIndex: 4, yearWithinStage: 1 },
  univ2: { stageIndex: 4, yearWithinStage: 2 },
  univ3: { stageIndex: 4, yearWithinStage: 3 },
  univ4: { stageIndex: 4, yearWithinStage: 4 },
};

export interface ChildInput {
  currentGrade: Grade;
  /** ステージごとの公立/私立選択。5ステージ分まとめて1入力ブロックとして受け取る（Spec 4章）。
   *  現在の学年より過去のステージの値は計算に使われない（未使用でも渡してよい）。 */
  stageSelections: {
    kindergarten: PublicPrivate;
    elementary: PublicPrivate;
    juniorHigh: PublicPrivate;
    highSchool: PublicPrivate;
    university: UniversityTrack;
  };
  /** 大学ステージのみのオプトイン（デフォルトOFF）。Spec 4章「仕送り」。 */
  livingAlone?: boolean;
  /** 円/年。省略時は REMITTANCE_PRESET_ANNUAL を使う。livingAlone=falseの場合は無視される。 */
  remittanceAnnual?: number;
}

interface StageSegment {
  stage: SchoolStage;
  /** このセグメントがステージ内の何年目から始まるか（1始まり）。大学の入学費用判定に使う。 */
  startYearWithinStage: number;
  /** このセグメントで計上する年数。 */
  yearsCount: number;
}

/**
 * 現在の学年から、大学卒業までのステージ区間（現在ステージの残り年数＋以降の全ステージ）を
 * 機械的に算出する。留年・浪人等は考慮しない（Spec 6章）。
 */
function resolveSegments(currentGrade: Grade): StageSegment[] {
  if (currentGrade === 'preK') {
    return SCHOOL_STAGES.map((stage) => ({
      stage,
      startYearWithinStage: 1,
      yearsCount: STAGE_DURATION_YEARS[stage],
    }));
  }

  const { stageIndex, yearWithinStage } = GRADE_POSITIONS[currentGrade];
  const currentStage = SCHOOL_STAGES[stageIndex];
  const currentStageDuration = STAGE_DURATION_YEARS[currentStage];

  const segments: StageSegment[] = [
    {
      stage: currentStage,
      startYearWithinStage: yearWithinStage,
      yearsCount: currentStageDuration - yearWithinStage + 1,
    },
  ];

  for (let i = stageIndex + 1; i < SCHOOL_STAGES.length; i++) {
    const stage = SCHOOL_STAGES[i];
    segments.push({ stage, startYearWithinStage: 1, yearsCount: STAGE_DURATION_YEARS[stage] });
  }

  return segments;
}

/**
 * 子供1人分の、現在〜大学卒業までの年次費用配列（円）を返す。
 * 配列のindex 0が「現在の学年のまま迎える今年」、以降1年ごとに1つ進む。
 *
 * 大学の入学費用は、セグメントがステージ1年目から始まる場合のみ初年度に一括計上する
 * （= 現在の学年が大学2年目以降の場合は、入学費用は過去に発生済みとして計上しない。Spec 6章）。
 */
export function calcChildYearlyCosts(child: ChildInput): number[] {
  const segments = resolveSegments(child.currentGrade);
  const costs: number[] = [];

  for (const segment of segments) {
    if (segment.stage !== 'university') {
      const publicPrivate = child.stageSelections[segment.stage];
      const annual = PRE_UNIVERSITY_ANNUAL_COST[segment.stage][publicPrivate];
      for (let i = 0; i < segment.yearsCount; i++) costs.push(annual);
      continue;
    }

    const track = child.stageSelections.university;
    const { entranceCost, annualCost } = UNIVERSITY_COST[track];
    const remittance = child.livingAlone ? (child.remittanceAnnual ?? REMITTANCE_PRESET_ANNUAL) : 0;

    for (let i = 0; i < segment.yearsCount; i++) {
      const isEntranceYear = segment.startYearWithinStage === 1 && i === 0;
      costs.push(annualCost + remittance + (isEntranceYear ? entranceCost : 0));
    }
  }

  return costs;
}

/** 子供全員分の教育費総額（円）。子供が0人の場合は0。 */
export function calcTotalEducationCost(children: ChildInput[]): number {
  return children.reduce((sum, child) => {
    const yearly = calcChildYearlyCosts(child);
    return sum + yearly.reduce((a, b) => a + b, 0);
  }, 0);
}

export interface PeakYearResult {
  /** 現在からの経過年数（0=今年）。子供が0人の場合は0。 */
  yearOffset: number;
  /** ピーク年の合算金額（円）。子供が0人の場合は0。 */
  amount: number;
}

/**
 * 子供全員分の年次費用を年ごとに合算し、最大となる年（経過年数）と金額を返す。
 * 子供ごとの年次配列は長さが異なる（学年差があるため）。短い配列は、その年以降0円として扱う。
 */
export function calcPeakYear(children: ChildInput[]): PeakYearResult {
  if (children.length === 0) return { yearOffset: 0, amount: 0 };

  const perChildYearly = children.map((child) => calcChildYearlyCosts(child));
  const maxLength = Math.max(...perChildYearly.map((y) => y.length));

  let peakYearOffset = 0;
  let peakAmount = -Infinity;

  for (let year = 0; year < maxLength; year++) {
    const total = perChildYearly.reduce((sum, yearly) => sum + (yearly[year] ?? 0), 0);
    if (total > peakAmount) {
      peakAmount = total;
      peakYearOffset = year;
    }
  }

  return { yearOffset: peakYearOffset, amount: peakAmount };
}
