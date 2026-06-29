import type { SimParams } from './types';
import { calcIdecoEligibleAge } from './helpers';

// ---- Asset class definitions (LTCMA 2026) ----

export interface AssetRow {
  assetClass: string;
  pct: number;
  amount?: number;   // 現在PF（① 現在）のみ使用。単位：万円
}

export const ASSET_CLASSES: { key: string; mu: number; sigma: number; group: string }[] = [
  { key: '全世界株',    mu: 7.0, sigma: 16.0, group: 'stock'    },
  { key: '先進国株',    mu: 6.5, sigma: 16.0, group: 'stock'    },
  { key: '新興国株',    mu: 8.0, sigma: 21.0, group: 'stock'    },
  { key: '日本株',      mu: 6.0, sigma: 17.0, group: 'stock'    },
  { key: '先進国債券',  mu: 4.0, sigma: 10.0, group: 'bond'     },
  { key: '日本債券',    mu: 1.0, sigma:  3.0, group: 'bond'     },
  { key: '先進国REIT',  mu: 7.0, sigma: 18.0, group: 'reit_dev' },
  { key: '日本REIT',    mu: 4.0, sigma: 15.0, group: 'reit_jp'  },
  { key: 'ゴールド',    mu: 5.0, sigma: 17.0, group: 'gold'     },
  { key: '短期債・MMF', mu: 1.5, sigma:  2.0, group: 'cash'     },
];

const ASSET_MU:    Record<string, number> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.mu]));
const ASSET_SIGMA: Record<string, number> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.sigma]));
const ASSET_GROUP: Record<string, string> = Object.fromEntries(ASSET_CLASSES.map(a => [a.key, a.group]));

export const ASSET_CORR: Record<string, Record<string, number>> = {
  stock:    { stock: 1.0, bond: 0.1, reit_dev: 0.7, reit_jp: 0.5, gold: 0.0, cash: 0.0 },
  bond:     { stock: 0.1, bond: 1.0, reit_dev: 0.1, reit_jp: 0.0, gold: 0.1, cash: 0.0 },
  reit_dev: { stock: 0.7, bond: 0.1, reit_dev: 1.0, reit_jp: 0.4, gold: 0.1, cash: 0.0 },
  reit_jp:  { stock: 0.5, bond: 0.0, reit_dev: 0.4, reit_jp: 1.0, gold: 0.0, cash: 0.0 },
  gold:     { stock: 0.0, bond: 0.1, reit_dev: 0.1, reit_jp: 0.0, gold: 1.0, cash: 0.0 },
  cash:     { stock: 0.0, bond: 0.0, reit_dev: 0.0, reit_jp: 0.0, gold: 0.0, cash: 0.0 },
};

export function calcMu(weights: AssetRow[]): number {
  if (!weights || !weights.length) return 0;
  return weights.reduce((s, w) => s + (w.pct / 100) * (ASSET_MU[w.assetClass] ?? 0), 0);
}

export function calcPortfolioMetrics(weights: AssetRow[]): { mu: number; sigma: number } {
  if (!weights || !weights.length) return { mu: 0, sigma: 0 };
  const mu = calcMu(weights);
  let sigma2 = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      const wi = weights[i].pct / 100, wj = weights[j].pct / 100;
      const si = ASSET_SIGMA[weights[i].assetClass] ?? 0;
      const sj = ASSET_SIGMA[weights[j].assetClass] ?? 0;
      const gi = ASSET_GROUP[weights[i].assetClass] ?? 'cash';
      const gj = ASSET_GROUP[weights[j].assetClass] ?? 'cash';
      const rho = (ASSET_CORR[gi] && ASSET_CORR[gi][gj] !== undefined) ? ASSET_CORR[gi][gj] : 0;
      sigma2 += wi * wj * si * sj * rho;
    }
  }
  return { mu, sigma: Math.sqrt(Math.max(0, sigma2)) };
}

export interface ProfileV3 {
  id: number;
  name: string;
  savedAt: string;
  version: 3;
  params: {
    curAge: number;
    lifeEx: number;
    baseInc: number;
    baseExp: number;
    inflR: number;
    mcStd: number;
    mcStdR: number;
    rWNisa: number;
    rRNisa: number;
    rWIdeco: number;
    rRIdeco: number;
    rWTax: number;
    rRTax: number;
    pfManualFlags: Record<string, boolean>;
    retAge: number;
    penAge: number;
    penAmtVal: number;
    bNisa: number;
    cNisa: number;
    cNisaTo: number;
    bIdeco: number;
    cIdeco: number;
    cIdecoTo: number;
    idecoYrs: number;
    sevYrs: number;
    idecoReceiveType: 'lump' | 'pension';
    idecoReceiveYears: number;
    idecoStartAge: number;
    bTax: number;
    cTax: number;
    cTaxTo: number;
    bCash: number;
    penAmt: number;
    spInc: number;
    spRetAge: number;
    spPenAge: number;
    spPenAmt: number;
    spCurAge: number;
    spNisaBal: number;
    spNisaCon: number;
    spNisaTo: number;
    spIdecoBal: number;
    spIdecoCon: number;
    spIdecoTo: number;
    spTaxBal: number;
    spTaxCon: number;
    spTaxTo: number;
    spSevYrs: number;
    spIdecoYrs: number;
    spIdecoReceiveType: 'lump' | 'pension';
    spIdecoStartAge: number;
    spCashBal: number;
  };
  portfolio: {
    current: {
      nisa:    AssetRow[];
      ideco:   AssetRow[];
      tax:     AssetRow[];
      spNisa:  AssetRow[];
      spIdeco: AssetRow[];
      spTax:   AssetRow[];
    };
    working:    { nisa: AssetRow[]; ideco: AssetRow[]; tax: AssetRow[] };
    retirement: { nisa: AssetRow[]; ideco: AssetRow[]; tax: AssetRow[]; sameAsWorking: boolean };
  };
  events: import('./types').LifeEvent[];
  ui: {
    cmpMode: string;
    activeStrategies: string[];
    activeScenarios: string[];
    currentMode: string;
    balSync: Record<string, boolean>;
  };
}

export const SAMPLE_PROFILE: ProfileV3 = {
  id: 0,
  name: 'サンプル',
  savedAt: '',
  version: 3,
  params: {
    curAge: 35, lifeEx: 90,
    baseInc: 500, baseExp: 300, inflR: 2,
    mcStd: 16, mcStdR: 10,
    rWNisa: 7, rRNisa: 4,
    rWIdeco: 4, rRIdeco: 2,
    rWTax: 2, rRTax: 1,
    pfManualFlags: {},
    retAge: 60, penAge: 65, penAmtVal: 150,
    bNisa: 200, cNisa: 72, cNisaTo: 60,
    bIdeco: 0, cIdeco: 0, cIdecoTo: 60,
    idecoYrs: 0, sevYrs: 20,
    idecoReceiveType: 'lump', idecoReceiveYears: 10, idecoStartAge: 60,
    bTax: 0, cTax: 0, cTaxTo: 60,
    bCash: 300,
    penAmt: 150,
    spInc: 0, spRetAge: 0, spPenAge: 0, spPenAmt: 0, spCurAge: 0,
    spNisaBal: 0, spNisaCon: 0, spNisaTo: 60,
    spIdecoBal: 0, spIdecoCon: 0, spIdecoTo: 60,
    spTaxBal: 0, spTaxCon: 0, spTaxTo: 60,
    spSevYrs: 0, spIdecoYrs: 0, spIdecoReceiveType: 'lump', spIdecoStartAge: 60, spCashBal: 0,
  },
  portfolio: {
    current:    { nisa: [], ideco: [], tax: [], spNisa: [], spIdeco: [], spTax: [] },
    working:    { nisa: [{ assetClass: '全世界株', pct: 100 }], ideco: [{ assetClass: '全世界株', pct: 100 }], tax: [{ assetClass: '全世界株', pct: 100 }] },
    retirement: { nisa: [], ideco: [], tax: [], sameAsWorking: true },
  },
  events: [],
  ui: {
    cmpMode: 'strategy',
    activeStrategies: ['proportional'],
    activeScenarios: ['base'],
    currentMode: 'fixed',
    balSync: { nisa: false, ideco: false, tax: false, cash: false },
  },
};

export function calcAggregatedSigma(acctRows: AssetRow[][], acctBals: number[]): number | null {
  const total = acctBals.reduce((s, b) => s + b, 0);
  const weights: number[] = total > 0
    ? acctBals.map(b => b / total)
    : acctBals.map(() => 1 / acctBals.length);

  const map: Record<string, number> = {};
  let hasAnyRow = false;
  for (let i = 0; i < acctRows.length; i++) {
    const rows = acctRows[i];
    const w = weights[i];
    if (w === 0) continue;
    for (const row of rows) {
      if (!row.assetClass || !(row.pct > 0)) continue;
      map[row.assetClass] = (map[row.assetClass] ?? 0) + (row.pct / 100) * w;
      hasAnyRow = true;
    }
  }
  if (!hasAnyRow) return null;

  const aggWeights: AssetRow[] = Object.entries(map).map(([assetClass, frac]) => ({
    assetClass,
    pct: frac * 100,
  }));
  return calcPortfolioMetrics(aggWeights).sigma;
}

export function profileToSimParams(profile: ProfileV3): SimParams {
  const p = profile.params;
  const sameAsWorking = profile.portfolio.retirement.sameAsWorking;

  const idecoYrs = Math.max(1, Math.min(40, p.idecoYrs || Math.max(1, p.retAge - 22)));
  const sevYrs   = Math.max(1, Math.min(45, p.sevYrs || idecoYrs));

  const idecoEligible = calcIdecoEligibleAge(idecoYrs, p.curAge, p.cIdecoTo);
  const idecoStartAge = Math.max(idecoEligible, Math.min(75, p.idecoStartAge));

  const hasIdeco =
    p.bIdeco > 0 ||
    (p.cIdeco > 0 && p.cIdecoTo > p.curAge);

  const spousePresent =
    p.spInc !== 0 || p.spPenAmt !== 0 ||
    (p.spNisaCon  ?? 0) > 0 || (p.spIdecoCon ?? 0) > 0 || (p.spTaxCon ?? 0) > 0 ||
    (p.spNisaBal  ?? 0) > 0 || (p.spIdecoBal ?? 0) > 0 || (p.spTaxBal ?? 0) > 0 ||
    (p.spCashBal  ?? 0) > 0;

  return {
    curAge:   p.curAge,
    lifeEx:   p.lifeEx || 90,
    baseInc:  p.baseInc,
    baseExp:  p.baseExp,
    inflR:    p.inflR ?? 2,
    retAge:   p.retAge,
    penAge:   p.penAge,
    penAmt:   p.penAmt ?? p.penAmtVal,
    mcStd:    p.mcStd || 12,
    mcStdR:   sameAsWorking ? (p.mcStd || 12) : (p.mcStdR || 8),
    hasIdeco,
    idecoYrs,
    sevYrs,
    idecoReceiveType:  p.idecoReceiveType  || 'lump',
    idecoReceiveYears: p.idecoReceiveYears || 10,
    idecoStartAge,
    acct: {
      nisa: {
        bal:   p.bNisa,
        con:   p.cNisa,
        toAge: p.cNisaTo || p.retAge,
        rW:    p.rWNisa,
        rR:    sameAsWorking ? p.rWNisa : p.rRNisa,
      },
      ideco: {
        bal:   p.bIdeco,
        con:   p.cIdeco,
        toAge: Math.min(p.cIdecoTo || 60, 60),
        rW:    p.rWIdeco,
        rR:    sameAsWorking ? p.rWIdeco : p.rRIdeco,
      },
      tax: {
        bal:       p.bTax,
        con:       p.cTax,
        toAge:     p.cTaxTo || p.retAge,
        costBasis: p.bTax,
        rW:        p.rWTax,
        rR:        sameAsWorking ? p.rWTax : p.rRTax,
      },
      cash: {
        bal: p.bCash,
      },
    },
    spouse: spousePresent
      ? {
          inc:              p.spInc,
          retAge:           p.spRetAge || p.retAge,
          penAge:           p.spPenAge || p.penAge,
          penAmt:           p.spPenAmt,
          spCurAge:         p.spCurAge,
          idecoYrs:         p.spIdecoYrs || 0,
          sevYrs:           p.spSevYrs   || 0,
          idecoReceiveType: p.spIdecoReceiveType  || 'lump',
          idecoReceiveYears: 10,
          idecoStartAge:    p.spIdecoStartAge || p.spRetAge || 60,
          acct: {
            nisa:  { bal: p.spNisaBal  ?? 0, con: p.spNisaCon  ?? 0, toAge: p.spNisaTo  ?? p.spRetAge ?? 60 },
            ideco: { bal: p.spIdecoBal ?? 0, con: p.spIdecoCon ?? 0, toAge: p.spIdecoTo ?? p.spRetAge ?? 60 },
            tax:   { bal: p.spTaxBal   ?? 0, con: p.spTaxCon   ?? 0, toAge: p.spTaxTo   ?? p.spRetAge ?? 60 },
            cash:  { bal: p.spCashBal  ?? 0 },
          },
        }
      : null,
  };
}
