export interface AccountConfig {
  bal: number;
  con: number;
  toAge: number;
  rW: number;
  rR: number;
  // その口座自身のσ（資産配分から算出。SIGMA-AUTO/相関行列込み）。
  // モンテカルロの動的σ計算（mcStdDynamic/mcStdRDynamic）でのみ使う内部値。
  // オプショナルなのは、SimParamsを直接組み立てる呼び出し元（scripts/full-verify.js等）との
  // 後方互換性のため——未設定なら動的モードは自動的に無効化され、従来通りmcStd/mcStdRを使う。
  sigmaW?: number;
  sigmaR?: number;
}

export interface TaxAccountConfig extends AccountConfig {
  costBasis: number;
}

export interface CashAccountConfig {
  bal: number;
}

export interface AccountState {
  nisa: AccountConfig;
  ideco: AccountConfig;
  tax: TaxAccountConfig;
  cash: CashAccountConfig;
}

export interface SpouseAcct {
  nisa:  { bal: number; con: number; toAge: number };
  ideco: { bal: number; con: number; toAge: number };
  tax:   { bal: number; con: number; toAge: number };
  cash?: { bal: number };
}

export interface SpouseParams {
  inc: number;
  retAge: number;
  penAge: number;
  penAmt: number;
  spCurAge: number;
  idecoYrs?: number;
  sevYrs?: number;
  idecoReceiveType?: 'lump' | 'pension' | 'split';
  idecoReceiveYears?: number;
  idecoSplitRatio?: number;
  idecoStartAge?: number;
  acct?: SpouseAcct;
}

export interface SimParams {
  curAge: number;
  lifeEx: number;
  baseInc: number;
  baseExp: number;
  inflR: number;
  retAge: number;
  penAge: number;
  penAmt: number;
  mcStd: number;
  mcStdR: number;
  // trueのとき、モンテカルロのshockはmcStd/mcStdR固定値ではなく、年ごとにその時点の
  // 口座別残高×口座別σ（acct.*.sigmaW/sigmaR）で動的に再計算する（相関=1想定の残高加重平均）。
  // 未設定/false＝従来通りmcStd/mcStdR固定値を使う静的モード。
  mcStdDynamic?: boolean;
  mcStdRDynamic?: boolean;
  hasIdeco: boolean;
  idecoYrs: number;
  idecoReceiveType: 'lump' | 'pension' | 'split';
  idecoReceiveYears: number;
  idecoStartAge: number;
  idecoSplitRatio: number;
  sevYrs: number;
  acct: AccountState;
  spouse: SpouseParams | null;
}

export type IncomeSubtype =
  | 'reemploy' | 'sidejob' | 'rental' | 'inheritance'
  | 'severance' | 'other_inc' | 'inc_change';

export type ExpenseSubtype =
  | 'education' | 'care' | 'renovation' | 'mortgage'
  | 'other_exp' | 'base_change'
  | 'nisa_con_change' | 'ideco_con_change' | 'tax_con_change';

interface BaseLifeEvent {
  name: string;
  age: number;
  years: number;
  amount: number;
  owner?: 'self' | 'spouse';
}

export interface IncomeEvent extends BaseLifeEvent {
  category: 'income';
  subtype: IncomeSubtype;
}

export interface ExpenseEvent extends BaseLifeEvent {
  category: 'expense';
  subtype: ExpenseSubtype;
  principal?: number;
  rate?: number;
  termYears?: number;
}

export type LifeEvent = IncomeEvent | ExpenseEvent;

export type WithdrawalStrategy = 'proportional' | 'cash_first' | 'taxable_first';

export type IdecoStatus = 'accumulation' | 'pension' | 'closed';

export interface YearSnap {
  age: number;
  totalAssets: number;
  nisa: number;
  ideco: number;
  tax: number;
  cash: number;
  spNisa: number;
  spIdeco: number;
  spTax: number;
  spCash: number;
  income: number;
  expense: number;
  cashFlow: number;
  extraInc: number;
  extraExp: number;
  nisaActive: boolean;
  idecoActive: boolean;
  taxActive: boolean;
  idecoTaxPaid: number;
  retirementTaxPaid: number;
  idecoAnnualGross: number;
  fillCash: number;
  fillNisa: number;
  hasSeverance: boolean;
  baseExp: number;
  idecoStatus: IdecoStatus;
  idecoBalanceBeforeWithdrawal: number | null;
  idecoWithdrawalAmount: number | null;
  severanceNet: number;
  spIdecoWithdrawalAmount: number | null;
  spRetirementTaxPaid: number;
  spSeveranceNet: number;
  spIdecoAnnualGross: number;
  spIdecoTaxPaid: number;
}

export interface AnalysisResult {
  last: number;
  pV: number;
  pA: number;
  dA: number | null;
  fA: number | null;
  assetLife: number | null;
  withdrawalRate: number | null;
  breakEven: number | null;
  penAgeAssets: number | null;
  idecoLumpNet: number;
  idecoLumpTax: number;
  idecoTotalTax: number;
  idecoTotalNetWithdrawal: number;
  idecoStartBalance: number;
  severanceNetKPI: number;
  spIdecoLumpNet: number;
  spIdecoTotalTax: number;
  spIdecoTotalNetWithdrawal: number;
  spSeveranceNetKPI: number;
  spRetirementTaxKPI: number;
}

export interface WithdrawResult {
  nisa: number;
  ideco: number;
  tax: number;
  cash: number;
  costBasis: number;
  fillCash: number;
  fillNisa: number;
}

export interface RetirementTaxResult {
  idecoNet: number;
  severanceNet: number;
  totalTax: number;
}

export interface MCPercentiles {
  p10: number[];
  p50: number[];
  p90: number[];
}

export interface MCStrategyResult {
  percentiles: MCPercentiles;
  bankruptcyRate: number;
  depletionMean: number | null;
  depletionMin: number | null;
}

export interface MCResult {
  strategies: Record<WithdrawalStrategy, MCStrategyResult>;
  trials: number;
}
