import type { SimParams, LifeEvent, WithdrawalStrategy, MCResult } from './types';
import { simulate } from './simulate';
import { randNorm } from './helpers';

export function runMC(
  p: SimParams,
  evs: LifeEvent[],
  strategies: WithdrawalStrategy[],
  N = 1000
): MCResult {
  const years = p.lifeEx - p.curAge + 1;
  const pct = (arr: number[], q: number): number => {
    const s = [...arr].sort((a, b) => a - b);
    const i = (s.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  };

  // 共通乱数法（CRN）：全戦略で同じショック列を共有
  const trialReturns: number[][] = Array.from({ length: N }, () =>
    Array.from({ length: years }, (_, yr) => {
      const isRet = (p.curAge + yr) >= p.retAge;
      return randNorm(0, isRet ? p.mcStdR : p.mcStd);
    })
  );

  const results: MCResult['strategies'] = {} as MCResult['strategies'];

  for (const st of strategies) {
    const allTotals: number[][] = Array.from({ length: years }, () => []);
    let bankruptCount = 0;
    const depletionAges: number[] = [];

    for (let t = 0; t < N; t++) {
      const snaps = simulate(p, evs, st, trialReturns[t]);
      let bankrupt = false;
      let depAge: number | null = null;
      snaps.forEach((s, i) => {
        allTotals[i].push(s.totalAssets);
        if (s.totalAssets === 0 && !bankrupt) { bankrupt = true; depAge = s.age; }
      });
      if (bankrupt) { bankruptCount++; if (depAge !== null) depletionAges.push(depAge); }
    }

    const percentiles = { p10: [] as number[], p50: [] as number[], p90: [] as number[] };
    allTotals.forEach(arr => {
      percentiles.p10.push(Math.round(pct(arr, 0.1)));
      percentiles.p50.push(Math.round(pct(arr, 0.5)));
      percentiles.p90.push(Math.round(pct(arr, 0.9)));
    });

    let depletionMean: number | null = null, depletionMin: number | null = null;
    if (depletionAges.length > 0) {
      depletionMean = Math.round(depletionAges.reduce((a, b) => a + b, 0) / depletionAges.length);
      depletionMin  = Math.min(...depletionAges);
    }

    results[st] = { percentiles, bankruptcyRate: bankruptCount / N * 100, depletionMean, depletionMin };
  }

  return { strategies: results, trials: N };
}
