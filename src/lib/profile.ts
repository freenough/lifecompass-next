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
    // 取崩期の利回りを積立期と揃えるかどうか（PF側の portfolio.retirement.sameAsWorking とは独立したフラグ）
    rateSameAsWorking: boolean;
    // 取崩期の標準偏差を積立期と揃えるかどうか（PF側・利回り側のsameAsWorkingとは独立したフラグ）
    sigmaSameAsWorking: boolean;
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
    idecoReceiveType: 'lump' | 'pension' | 'split';
    idecoReceiveYears: number;
    idecoSplitRatio: number;
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
    spIdecoReceiveType: 'lump' | 'pension' | 'split';
    spIdecoReceiveYears: number;
    spIdecoSplitRatio: number;
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
    rateSameAsWorking: true,
    sigmaSameAsWorking: true,
    // サンプルデータのrW/rR/mcStdはポートフォリオ内訳から導出したものではなく、
    // 直接指定された固定値のため「手動」扱いにする（PFが空でもMCバリデーションに引っかからないように）。
    pfManualFlags: { rWNisa: true, rWIdeco: true, rWTax: true, rRNisa: true, rRIdeco: true, rRTax: true, mcStd: true },
    retAge: 60, penAge: 65, penAmtVal: 150,
    bNisa: 200, cNisa: 72, cNisaTo: 60,
    bIdeco: 0, cIdeco: 0, cIdecoTo: 60,
    idecoYrs: 0, sevYrs: 20,
    idecoReceiveType: 'lump', idecoReceiveYears: 10, idecoSplitRatio: 50, idecoStartAge: 60,
    bTax: 0, cTax: 0, cTaxTo: 60,
    bCash: 300,
    penAmt: 150,
    spInc: 0, spRetAge: 0, spPenAge: 0, spPenAmt: 0, spCurAge: 0,
    spNisaBal: 0, spNisaCon: 0, spNisaTo: 60,
    spIdecoBal: 0, spIdecoCon: 0, spIdecoTo: 60,
    spTaxBal: 0, spTaxCon: 0, spTaxTo: 60,
    spSevYrs: 0, spIdecoYrs: 0, spIdecoReceiveType: 'lump',
    spIdecoReceiveYears: 10, spIdecoSplitRatio: 50,
    spIdecoStartAge: 60, spCashBal: 0,
  },
  portfolio: {
    current:    { nisa: [], ideco: [], tax: [], spNisa: [], spIdeco: [], spTax: [] },
    working:    { nisa: [], ideco: [], tax: [] },
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

/**
 * 複数口座のσを合成する。口座「内」の複数資産クラスの合成にはLTCMA相関行列
 * （calcPortfolioMetrics・SIGMA-AUTO）を使うが、口座「間」の合成は相関=1
 * （モンテカルロの全口座同一shockモデルに整合する厳密解）として単純な残高加重線形和を使う。
 * 口座をまたいで資産クラスをマージしてcalcPortfolioMetricsに通してはいけない
 * ――それは口座間にも相関行列（ρ<1）を適用してしまい、σを過小評価する誤りになる
 * （2026-07-04発見・修正）。
 */
export function calcAggregatedSigma(acctRows: AssetRow[][], acctBals: number[]): number | null {
  const total = acctBals.reduce((s, b) => s + b, 0);
  const weights: number[] = total > 0
    ? acctBals.map(b => b / total)
    : acctBals.map(() => 1 / acctBals.length);

  let sigma = 0;
  let hasAnyRow = false;
  for (let i = 0; i < acctRows.length; i++) {
    const rows = acctRows[i];
    if (!rows || rows.length === 0) continue;
    const w = weights[i];
    if (w === 0) continue;
    // 口座自身のσ（口座内はSIGMA-AUTO＝相関行列込みで正しく算出）
    sigma += w * calcPortfolioMetrics(rows).sigma;
    hasAnyRow = true;
  }
  if (!hasAnyRow) return null;
  return sigma;
}

/**
 * 全口座集計のμ・σの重み付けに使う「各口座の実際の残高（＋積立期の場合は積立額）」を算出する。
 * ①現在のPFに金額入力があればそれを優先し、なければparamsのbNisa/bIdeco/bTaxを使う
 * （updatePortfolio/copyCurrentToWorkingの残高同期と同じ優先順位）。
 * 資産配分（PF欄）の入力有無とは無関係に、残高・積立額が0円の口座は重み0になる。
 * μ・σどちらの集計もこの同じ重みを参照する（整合性のため）。
 */
export function getAggregateWeights(profile: ProfileV3, phase: 'working' | 'retirement'): [number, number, number] {
  const p = profile.params;
  const cur = profile.portfolio.current;
  const bNisaCur  = cur.nisa.reduce((s, r) => s + (r.amount ?? 0), 0);
  const bIdecoCur = cur.ideco.reduce((s, r) => s + (r.amount ?? 0), 0);
  const bTaxCur   = cur.tax.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalCur  = bNisaCur + bIdecoCur + bTaxCur;
  const bNisa  = totalCur > 0 ? bNisaCur  : p.bNisa;
  const bIdeco = totalCur > 0 ? bIdecoCur : p.bIdeco;
  const bTax   = totalCur > 0 ? bTaxCur   : p.bTax;
  if (phase === 'working') {
    return [bNisa + (p.cNisa ?? 0), bIdeco + (p.cIdeco ?? 0), bTax + (p.cTax ?? 0)];
  }
  return [bNisa, bIdeco, bTax];
}

/**
 * 全口座集計のμ（表示専用・読み取り専用のライブ値）を算出する。
 * μは各口座自身の残高に紐づいてシミュレーションへ個別に適用されるため
 * （getEffectiveRW/RR）、この集計値自体はシミュレーション結果に一切影響しない
 * 表示専用の数値だが、重み付けはσ側（getAggregateWeights・実残高＋積立額）と統一する。
 */
export function calcAggregateMu(profile: ProfileV3, rows: [AssetRow[], AssetRow[], AssetRow[]], phase: 'working' | 'retirement'): number {
  const weights = getAggregateWeights(profile, phase);
  const total = weights.reduce((s, w) => s + w, 0);
  const norm = total > 0 ? weights.map(w => w / total) : [1 / 3, 1 / 3, 1 / 3];
  return rows.reduce((sum, r, i) => sum + calcMu(r) * norm[i], 0);
}

/**
 * 全口座集計のσ（Monte Carloシミュレーションに直接使われる実効値と共通）を算出する。
 * 重みは実際の残高・積立額のみ（getAggregateWeights）。PF欄に資産配分の入力があるかどうかは
 * 重みの有無と無関係――残高・積立額が0円の口座は、資産配分を入力しても重み0のままにする。
 * 相関=1（口座横断で全口座が同じshockを受ける）という設計を前提にすれば、この残高加重平均は
 * 近似ではなく数学的に正確な合成方法である（σ(aX+bY)=|a|σX+|b|σY when ρ(X,Y)=1）。
 * PF側の「全口座集計」表示と、MC設定側の「PF計算値を使う」実効値は、
 * 両方ともこの関数だけを参照する。ここを直接変更すれば両方に反映される。
 */
export function calcAggregateSigma(
  profile: ProfileV3,
  rows: [AssetRow[], AssetRow[], AssetRow[]],
  phase: 'working' | 'retirement',
): number {
  return calcAggregatedSigma(rows, getAggregateWeights(profile, phase)) ?? 0;
}

// 口座が積立/取崩期にアクティブ（残高または積立/取崩が発生する）かどうか
function isAcctActive(bal: number, con: number, toAge: number, curAge: number): boolean {
  return bal > 0 || (con > 0 && toAge > curAge);
}

/**
 * ポートフォリオが未設定（0行）のまま利回りが自動計算に依存しているアクティブな口座を検出する。
 * 0行のまま「μ=0%」で暗黙に計算を進めることを防ぐため、MC実行前のバリデーションに使う。
 * 戻り値: 未設定口座のラベル一覧（空配列なら問題なし）。
 */
export function getUnconfiguredAccounts(profile: ProfileV3): string[] {
  const p = profile.params;
  const pf = profile.portfolio;
  const flags = p.pfManualFlags;
  const issues: string[] = [];

  const check = (label: string, active: boolean, rows: AssetRow[], manualFlagKey: string) => {
    if (active && rows.length === 0 && !flags[manualFlagKey]) {
      issues.push(label);
    }
  };

  check('NISA（積立期）',   isAcctActive(p.bNisa,  p.cNisa,  p.cNisaTo  || p.retAge, p.curAge), pf.working.nisa,  'rWNisa');
  check('iDeCo（積立期）',  isAcctActive(p.bIdeco, p.cIdeco, p.cIdecoTo || 60,        p.curAge), pf.working.ideco, 'rWIdeco');
  check('特定口座（積立期）', isAcctActive(p.bTax,   p.cTax,   p.cTaxTo   || p.retAge, p.curAge), pf.working.tax,   'rWTax');

  // rateSameAsWorkingがONの場合、取崩期の実効利回りは積立期の値をそのままコピーする
  // （getEffectiveRR参照）。この場合、取崩期のPF行数・pfManualFlagsは実際の計算に
  // 一切使われないため、未設定でも警告を出すべきではない。
  if (!p.rateSameAsWorking && !pf.retirement.sameAsWorking) {
    check('NISA（取崩期）',   isAcctActive(p.bNisa,  p.cNisa,  p.cNisaTo  || p.retAge, p.curAge), pf.retirement.nisa,  'rRNisa');
    check('iDeCo（取崩期）',  isAcctActive(p.bIdeco, p.cIdeco, p.cIdecoTo || 60,        p.curAge), pf.retirement.ideco, 'rRIdeco');
    check('特定口座（取崩期）', isAcctActive(p.bTax,   p.cTax,   p.cTaxTo   || p.retAge, p.curAge), pf.retirement.tax,   'rRTax');
  }

  return issues;
}

/**
 * 退職年齢を変更した際に取り残されがちな、退職年齢と連動すべき値のズレを検出する。
 * simulate()は積立を必ず退職年齢で打ち切るため計算結果には影響しないが、UI表示が
 * 実態と食い違って見える（積立終了年齢が退職年齢より後のまま等）ことへの注意喚起。
 * 戻り値: 警告メッセージ一覧（空配列なら問題なし）。
 */
export function getRetirementAgeWarnings(profile: ProfileV3): string[] {
  const p = profile.params;
  const warnings: string[] = [];

  if (p.cNisaTo && p.cNisaTo > p.retAge) {
    warnings.push(`NISA積立終了年齢（${p.cNisaTo}歳）が退職年齢（${p.retAge}歳）より後になっています。実際の積立は退職年齢で停止します。`);
  }
  if (p.cIdecoTo && p.cIdecoTo > p.retAge) {
    warnings.push(`iDeCo積立終了年齢（${p.cIdecoTo}歳）が退職年齢（${p.retAge}歳）より後になっています。実際の積立は退職年齢で停止します。`);
  }
  if (p.cTaxTo && p.cTaxTo > p.retAge) {
    warnings.push(`特定口座積立終了年齢（${p.cTaxTo}歳）が退職年齢（${p.retAge}歳）より後になっています。実際の積立は退職年齢で停止します。`);
  }

  for (const ev of profile.events) {
    if (ev.category === 'income' && ev.subtype === 'severance') {
      const targetAge = ev.owner === 'spouse' ? p.spRetAge : p.retAge;
      if (targetAge && ev.age !== targetAge) {
        const who = ev.owner === 'spouse' ? '配偶者の退職年齢' : '退職年齢';
        warnings.push(`退職金イベントの年齢（${ev.age}歳）が現在の${who}（${targetAge}歳）と一致していません。`);
      }
    }
  }

  return warnings;
}

export type AcctKey = 'Nisa' | 'Ideco' | 'Tax';
const ACCT_ROWS_KEY: Record<AcctKey, 'nisa' | 'ideco' | 'tax'> = { Nisa: 'nisa', Ideco: 'ideco', Tax: 'tax' };

/**
 * 積立期の実効rWを返す。「PF計算値を使う」がONならポートフォリオからその都度算出し（getter）、
 * 独立したstateとして保持・同期しない。OFF（手動）ならparamsの値をそのまま使う。
 */
export function getEffectiveRW(profile: ProfileV3, acct: AcctKey): number {
  const p = profile.params;
  const manualKey = `rW${acct}`;
  const valueKey = manualKey as 'rWNisa' | 'rWIdeco' | 'rWTax';
  if (p.pfManualFlags[manualKey]) return p[valueKey];
  return parseFloat(calcMu(profile.portfolio.working[ACCT_ROWS_KEY[acct]]).toFixed(1));
}

/**
 * 取崩期の実効rRを返す。rateSameAsWorkingがONなら積立期の実効値をそのまま参照する
 * （独立したstateにコピーせず、常にgetEffectiveRW経由の算出値とすることで同期漏れを防ぐ）。
 * OFFの場合は「PF計算値を使う」/手動の個別フラグに従う。
 */
export function getEffectiveRR(profile: ProfileV3, acct: AcctKey): number {
  if (profile.params.rateSameAsWorking) return getEffectiveRW(profile, acct);
  const p = profile.params;
  const manualKey = `rR${acct}`;
  const valueKey = manualKey as 'rRNisa' | 'rRIdeco' | 'rRTax';
  if (p.pfManualFlags[manualKey]) return p[valueKey];
  const rowsKey = ACCT_ROWS_KEY[acct];
  const rows = profile.portfolio.retirement.sameAsWorking
    ? profile.portfolio.working[rowsKey]
    : profile.portfolio.retirement[rowsKey];
  return parseFloat(calcMu(rows).toFixed(1));
}

/**
 * 口座自身のσ（積立期／取崩期）。その口座の資産配分から、SIGMA-AUTOエンジン
 * （calcPortfolioMetrics・LTCMA相関行列込み）で算出する。全口座集計の手動フラグは見ない
 * ――この値はモンテカルロの動的σ計算（simulate.ts）でのみ使う口座別の内部値であり、
 * 「PF計算値を使う/手動」の対象になっているのはあくまで全口座集計後のmcStd/mcStdRの方。
 */
export function getAccountSigmaW(profile: ProfileV3, acct: AcctKey): number {
  return calcPortfolioMetrics(profile.portfolio.working[ACCT_ROWS_KEY[acct]]).sigma;
}

export function getAccountSigmaR(profile: ProfileV3, acct: AcctKey): number {
  const rowsKey = ACCT_ROWS_KEY[acct];
  const rows = profile.portfolio.retirement.sameAsWorking
    ? profile.portfolio.working[rowsKey]
    : profile.portfolio.retirement[rowsKey];
  return calcPortfolioMetrics(rows).sigma;
}

/**
 * 積立期の実効標準偏差(σ)を返す。「PF計算値を使う」がONならcalcAggregateSigma経由で
 * PF側「全口座集計」とまったく同じ値をその都度算出し（getter）、独立したstateとして
 * 保持・同期しない。OFF（手動）ならparamsの値を使う。
 */
export function getEffectiveMcStd(profile: ProfileV3): number {
  const p = profile.params;
  if (p.pfManualFlags['mcStd']) return p.mcStd;
  const sigma = calcAggregateSigma(
    profile,
    [profile.portfolio.working.nisa, profile.portfolio.working.ideco, profile.portfolio.working.tax],
    'working',
  );
  return parseFloat(sigma.toFixed(1));
}

/**
 * 取崩期の実効標準偏差(σ)を返す。sigmaSameAsWorkingがONなら積立期の実効値をそのまま参照する
 * （独立したstateにコピーせず、常にgetEffectiveMcStd経由の算出値とすることで同期漏れを防ぐ）。
 * OFFの場合は「PF計算値を使う」/手動の個別フラグに従う。
 * PF側の portfolio.retirement.sameAsWorking は資産配分の同期のみに使う（σを直接動かさない）。
 * calcAggregateSigma経由でPF側「全口座集計」とまったく同じ値を算出する。
 */
export function getEffectiveMcStdR(profile: ProfileV3): number {
  if (profile.params.sigmaSameAsWorking) return getEffectiveMcStd(profile);
  const p = profile.params;
  if (p.pfManualFlags['mcStdR']) return p.mcStdR;
  const rows: [AssetRow[], AssetRow[], AssetRow[]] = profile.portfolio.retirement.sameAsWorking
    ? [profile.portfolio.working.nisa, profile.portfolio.working.ideco, profile.portfolio.working.tax]
    : [profile.portfolio.retirement.nisa, profile.portfolio.retirement.ideco, profile.portfolio.retirement.tax];
  const sigma = calcAggregateSigma(profile, rows, 'retirement');
  return parseFloat(sigma.toFixed(1));
}

export function profileToSimParams(profile: ProfileV3): SimParams {
  const p = profile.params;

  const idecoYrs = Math.max(1, Math.min(40, p.idecoYrs || Math.max(1, p.retAge - 22)));
  const sevYrs   = Math.max(1, Math.min(45, p.sevYrs || idecoYrs));

  const idecoEligible = calcIdecoEligibleAge(idecoYrs, p.curAge, p.cIdecoTo);
  const idecoStartAge = Math.max(idecoEligible, Math.min(75, p.idecoStartAge));

  const spIdecoEligible = calcIdecoEligibleAge(p.spIdecoYrs || 0, p.spCurAge || p.curAge, p.spIdecoTo);
  const spIdecoStartAge = Math.max(spIdecoEligible, Math.min(75, p.spIdecoStartAge || p.spRetAge || 60));

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
    mcStd:    getEffectiveMcStd(profile),
    mcStdR:   getEffectiveMcStdR(profile),
    // 動的モード: 「PF計算値を使う」がONのときだけ、シミュレーション内で年ごとに
    // 口座別σ×その時点の残高で再計算する。手動入力（OFF）のときは従来通り固定値。
    mcStdDynamic:  !p.pfManualFlags['mcStd'],
    mcStdRDynamic: p.sigmaSameAsWorking ? !p.pfManualFlags['mcStd'] : !p.pfManualFlags['mcStdR'],
    hasIdeco,
    idecoYrs,
    sevYrs,
    idecoReceiveType:  p.idecoReceiveType  || 'lump',
    idecoReceiveYears: p.idecoReceiveYears || 10,
    idecoSplitRatio:   p.idecoSplitRatio   ?? 50,
    idecoStartAge,
    acct: {
      nisa: {
        bal:   p.bNisa,
        con:   p.cNisa,
        toAge: p.cNisaTo || p.retAge,
        rW:    getEffectiveRW(profile, 'Nisa'),
        rR:    getEffectiveRR(profile, 'Nisa'),
        sigmaW: getAccountSigmaW(profile, 'Nisa'),
        sigmaR: getAccountSigmaR(profile, 'Nisa'),
      },
      ideco: {
        bal:   p.bIdeco,
        con:   p.cIdeco,
        toAge: Math.min(p.cIdecoTo || 60, 60),
        rW:    getEffectiveRW(profile, 'Ideco'),
        rR:    getEffectiveRR(profile, 'Ideco'),
        sigmaW: getAccountSigmaW(profile, 'Ideco'),
        sigmaR: getAccountSigmaR(profile, 'Ideco'),
      },
      tax: {
        bal:       p.bTax,
        con:       p.cTax,
        toAge:     p.cTaxTo || p.retAge,
        costBasis: p.bTax,
        rW:        getEffectiveRW(profile, 'Tax'),
        rR:        getEffectiveRR(profile, 'Tax'),
        sigmaW: getAccountSigmaW(profile, 'Tax'),
        sigmaR: getAccountSigmaR(profile, 'Tax'),
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
          idecoReceiveYears: p.spIdecoReceiveYears || 10,
          idecoSplitRatio:  p.spIdecoSplitRatio    ?? 50,
          idecoStartAge:    spIdecoStartAge,
          acct: {
            nisa:  { bal: p.spNisaBal  ?? 0, con: p.spNisaCon  ?? 0, toAge: p.spNisaTo  ?? p.spRetAge ?? 60 },
            ideco: { bal: p.spIdecoBal ?? 0, con: p.spIdecoCon ?? 0, toAge: p.spIdecoTo ?? p.spRetAge ?? 60 },
            tax:   { bal: p.spTaxBal   ?? 0, con: p.spTaxCon   ?? 0, toAge: p.spTaxTo   ?? p.spRetAge ?? 60, costBasis: p.spTaxBal ?? 0 },
            cash:  { bal: p.spCashBal  ?? 0 },
          },
        }
      : null,
  };
}
