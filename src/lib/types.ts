export interface AccountConfig {
  bal: number;
  con: number;
  toAge: number;
  rW: number;
  rR: number;
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

export interface SpouseParams {
  inc: number;
  retAge: number;
  penAge: number;
  penAmt: number;
  spCurAge: number;
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
  hasIdeco: boolean;
  idecoYrs: number;
  idecoReceiveType: 'lump' | 'pension';
  idecoReceiveYears: number;
  idecoStartAge: number;
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
  idecoLumpNet: number;
  idecoLumpTax: number;
  idecoTotalTax: number;
  idecoTotalNetWithdrawal: number;
  idecoStartBalance: number;
  severanceNetKPI: number;
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
