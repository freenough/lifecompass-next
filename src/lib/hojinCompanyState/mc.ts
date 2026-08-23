// CompanyStateの計算エントリーポイント（固定計算・MC計算を統合、最終版指示書3.7節）。
// このファイルが、法人側コードから個人側ロックファイル（simulate.ts/analyze.ts）への
// 唯一の接続点になる。montecarlo.ts（ロック対象外だが変更禁止）はimportしない——
// パーセンタイル集計は同種の小さなロジックをここに複製する（3.7節で明示的に許可）。

import { simulate } from '../simulate';
import { analyze } from '../analyze';
import { randNorm } from '../helpers';
import type { LifeEvent, SimParams, WithdrawalStrategy, YearSnap, AnalysisResult } from '../types';
import { buildCorporateGeneratedEventsFromSnaps } from './buildCombinedSimulationInput';
import { simulateCorporateAssets } from './corporateGrowth';
import type { CompanyStateSettings, CorporateLifeEvent, CorporatePortfolio, CorporateYearSnap } from './types';

export interface CombinedFixedResult {
  personalSnaps: YearSnap[];
  personalAnalysis: AnalysisResult;
  corporateSnaps: CorporateYearSnap[];
}

export interface CombinedMcPercentiles {
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface CombinedMcStrategyResult {
  percentiles: CombinedMcPercentiles;
  bankruptcyRate: number;
}

// 3戦略（比例取崩／現金優先／課税優先）それぞれ独立に計算する。1戦略分を複製する簡略化は
// 「トグルON時に戦略間の差が実際には消えていないのに消えて見える」誤表示になるため廃止した
// （2026-08-21修正）。
const ALL_STRATEGIES: WithdrawalStrategy[] = ['proportional', 'cash_first', 'taxable_first'];

export interface CombinedMcResult {
  trials: number;
  // 個人単独（simulatorStore.mcResult相当）。ただしこちらは合算計算と同じZスコア列を
  // 使って独立に算出したもので、simulatorStore.mcResult（別途生成した乱数）とは一致しない。
  personalOnly: Record<WithdrawalStrategy, CombinedMcStrategyResult>;
  // 個人側総資産＋法人側総資産（investedBalance+cashBalance）を試行ごとに合算した分布。
  combined: Record<WithdrawalStrategy, CombinedMcStrategyResult>;
}

function pct(arr: number[], q: number): number {
  const s = [...arr].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}

function toPercentiles(totalsByYear: number[][]): CombinedMcPercentiles {
  const percentiles: CombinedMcPercentiles = { p10: [], p50: [], p90: [] };
  totalsByYear.forEach(arr => {
    percentiles.p10.push(Math.round(pct(arr, 0.1)));
    percentiles.p50.push(Math.round(pct(arr, 0.5)));
    percentiles.p90.push(Math.round(pct(arr, 0.9)));
  });
  return percentiles;
}

// 指定された戦略ぶんだけ試行ループを回す共通ロジック。法人側は戦略に依存しないため
// 1試行につき1回だけ計算し、渡された戦略数ぶんで共有する（3戦略版・1戦略版どちらからも使う）。
//
// 2026-08-23バグ修正：evsは個人側の「生の」イベント配列（法人取崩から生成したイベントを含まない）。
// 個人側へ注入する法人取崩収入イベントは、試行ごとのcorporateSnaps（その試行のZショックを反映した
// 実際の取崩額、残高不足による減額を含む）から都度生成する。以前は全試行で共通の1つのmergedEvents
// （法人イベントの「要求額」をそのまま使う静的な変換）を使い回していたため、法人資産が試行の
// 途中で枯渇しても、個人側は残りの期間も満額の収入を受け取り続けてしまっていた。
function runMcTrialsForStrategies(
  p: SimParams,
  evs: LifeEvent[],
  strategies: WithdrawalStrategy[],
  corporateSettings: CompanyStateSettings,
  corporatePortfolio: CorporatePortfolio,
  corporateEvents: CorporateLifeEvent[],
  trials: number,
): {
  personalOnly: Record<WithdrawalStrategy, CombinedMcStrategyResult>;
  combined: Record<WithdrawalStrategy, CombinedMcStrategyResult>;
} {
  // N試行ぶんのZスコア行列を生成する。各行の長さは必ずp.lifeEx-p.curAge+1と一致させる
  // （調査で判明した通り、長さが合わないとsimulate()内でNaNが静かに伝播するため）。
  const years = p.lifeEx - p.curAge + 1;
  const zMatrix: number[][] = Array.from({ length: trials }, () =>
    Array.from({ length: years }, () => randNorm(0, 1)),
  );

  const personalTotalsByYear = {} as Record<WithdrawalStrategy, number[][]>;
  const combinedTotalsByYear = {} as Record<WithdrawalStrategy, number[][]>;
  const personalBankruptCount = {} as Record<WithdrawalStrategy, number>;
  const combinedBankruptCount = {} as Record<WithdrawalStrategy, number>;
  for (const st of strategies) {
    personalTotalsByYear[st] = Array.from({ length: years }, () => []);
    combinedTotalsByYear[st] = Array.from({ length: years }, () => []);
    personalBankruptCount[st] = 0;
    combinedBankruptCount[st] = 0;
  }

  for (let t = 0; t < trials; t++) {
    const z = zMatrix[t];
    const corporateSnaps = simulateCorporateAssets(
      corporateSettings, p.curAge, p.lifeEx, corporatePortfolio, corporateEvents, z,
    );
    // この試行で法人が実際に賄えた取崩額（残高不足で減額された年を含む）から、
    // この試行専用の個人側注入イベントを生成する。
    const generatedEvents = buildCorporateGeneratedEventsFromSnaps(corporateSnaps, corporateSettings.effectiveTaxRate);
    const mergedEventsForTrial = [...evs, ...generatedEvents];

    for (const st of strategies) {
      const personalSnaps = simulate(p, mergedEventsForTrial, st, z);
      let personalTrialBankrupt = false;
      let combinedTrialBankrupt = false;
      personalSnaps.forEach((s, i) => {
        const corpTotal = corporateSnaps[i]?.total ?? 0;
        personalTotalsByYear[st][i].push(s.totalAssets);
        combinedTotalsByYear[st][i].push(s.totalAssets + corpTotal);
        if (s.totalAssets === 0) personalTrialBankrupt = true;
        if (s.totalAssets + corpTotal <= 0) combinedTrialBankrupt = true;
      });
      if (personalTrialBankrupt) personalBankruptCount[st]++;
      if (combinedTrialBankrupt) combinedBankruptCount[st]++;
    }
  }

  const buildResult = (
    totalsByYear: Record<WithdrawalStrategy, number[][]>,
    bankruptCount: Record<WithdrawalStrategy, number>,
  ): Record<WithdrawalStrategy, CombinedMcStrategyResult> => {
    const result = {} as Record<WithdrawalStrategy, CombinedMcStrategyResult>;
    for (const st of strategies) {
      result[st] = {
        percentiles: toPercentiles(totalsByYear[st]),
        bankruptcyRate: (bankruptCount[st] / trials) * 100,
      };
    }
    return result;
  };

  return {
    personalOnly: buildResult(personalTotalsByYear, personalBankruptCount),
    combined: buildResult(combinedTotalsByYear, combinedBankruptCount),
  };
}

export function runCombinedSimulation(
  p: SimParams,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  corporateSettings: CompanyStateSettings,
  corporatePortfolio: CorporatePortfolio,
  corporateEvents: CorporateLifeEvent[],
  mode: 'fixed',
): CombinedFixedResult;
export function runCombinedSimulation(
  p: SimParams,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  corporateSettings: CompanyStateSettings,
  corporatePortfolio: CorporatePortfolio,
  corporateEvents: CorporateLifeEvent[],
  mode: 'mc',
  trials?: number,
): CombinedMcResult;
export function runCombinedSimulation(
  p: SimParams,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  corporateSettings: CompanyStateSettings,
  corporatePortfolio: CorporatePortfolio,
  corporateEvents: CorporateLifeEvent[],
  mode: 'fixed' | 'mc',
  trials = 1000,
): CombinedFixedResult | CombinedMcResult {
  if (mode === 'fixed') {
    // 固定計算はショックなし(z=null)の決定論的な1本の推移のため、法人の実際の取崩額
    // （残高不足による減額を含む）を先に計算してから、その実額を個人側イベントへ変換する
    // （2026-08-23バグ修正：以前は法人イベントの要求額をそのまま使う静的な変換だったため、
    // 法人資産が枯渇した年以降も個人側が満額の収入を受け取り続けてしまっていた）。
    const corporateSnaps = simulateCorporateAssets(
      corporateSettings, p.curAge, p.lifeEx, corporatePortfolio, corporateEvents, null,
    );
    const generatedEvents = buildCorporateGeneratedEventsFromSnaps(corporateSnaps, corporateSettings.effectiveTaxRate);
    const mergedEvents = [...evs, ...generatedEvents];
    const personalSnaps = simulate(p, mergedEvents, strategy);
    const personalAnalysis = analyze(personalSnaps, p);
    return { personalSnaps, personalAnalysis, corporateSnaps };
  }

  // MCモード：引数のstrategyは使わない（3戦略すべてを常に計算するため）。
  // シグネチャは固定計算モードと揃えて呼び出し側を単純にするためにそのまま残す。
  void strategy;

  const { personalOnly, combined } = runMcTrialsForStrategies(
    p, evs, ALL_STRATEGIES, corporateSettings, corporatePortfolio, corporateEvents, trials,
  );
  return { trials, personalOnly, combined };
}

export interface CombinedMcSingleResult {
  trials: number;
  personalOnly: CombinedMcStrategyResult;
  combined: CombinedMcStrategyResult;
}

/**
 * 指定した1戦略だけで法人合算MCを計算する軽量版（ImpactTable.tsx等、多数の代替シナリオを
 * 短時間で比較する用途向け）。法人側の成長計算は戦略に依存しないため、3戦略版
 * （runCombinedSimulation(...,'mc')）を使って不要な2戦略ぶんまで計算する必要はない。
 */
export function runCombinedMcForStrategy(
  p: SimParams,
  evs: LifeEvent[],
  strategy: WithdrawalStrategy,
  corporateSettings: CompanyStateSettings,
  corporatePortfolio: CorporatePortfolio,
  corporateEvents: CorporateLifeEvent[],
  trials = 300,
): CombinedMcSingleResult {
  const { personalOnly, combined } = runMcTrialsForStrategies(
    p, evs, [strategy], corporateSettings, corporatePortfolio, corporateEvents, trials,
  );
  return { trials, personalOnly: personalOnly[strategy], combined: combined[strategy] };
}
