// CompanyState（一人法人向け法人資産FIREシミュレーター）専用の型定義。
// 個人側の型（src/lib/types.ts、ロック対象）とは完全に独立。import禁止・複製方針
// （hitori-hojin全体の既存ルール、hojinAssetManagementと同じ方針）。

export type CorporateEventKind = 'business_profit' | 'withdrawal'; // '事業利益' | '取崩'

export interface CorporateLifeEvent {
  id: string;
  kind: CorporateEventKind;
  label: string;      // 名称（省略可、UIの「名称」欄）
  startAge: number;   // 開始年齢
  years: number;      // 期間（年）
  amount: number;     // 金額/年（万円）
}

export interface CorporatePortfolioRow {
  assetClass: string;
  pct: number;
}

export interface CorporatePortfolioPhase {
  rows: CorporatePortfolioRow[];
  // μ・σ直接入力トグル（UI仕上げ指示書1章）。個人側SimulatorForm.tsxのRateField
  // （PF計算値を使う/手入力を切り替えるMiniToggle）と同じパターン。
  // useManualMu/useManualSigmaは独立したフラグ（2026-08-21最終チェックリスト3番で分離）。
  // 個人側は口座ごとにpfManualFlags['rWNisa']/['rRNisa']等が完全に独立しており、
  // 「利回りは手入力・標準偏差は自動」のような混在が可能。以前は単一のuseManualで
  // μ・σを束ねていたため、rateSameAsWorking/sigmaSameAsWorkingを独立トグルとして
  // 追加すると、一方をOFFにした瞬間にもう一方まで強制的に手動化されてしまう不整合が
  // あった。true時はmanualMu/manualSigmaを使い、false/未設定時は資産クラス％配分から
  // calcPortfolioMetrics()で自動算出する。
  useManualMu?: boolean;
  manualMu?: number;
  useManualSigma?: boolean;
  manualSigma?: number;
}

export interface CorporatePortfolio {
  current: CorporatePortfolioPhase;
  working: CorporatePortfolioPhase;
  retirement: CorporatePortfolioPhase;
  retirementSameAsWorking: boolean; // PortfolioPanel.tsxのsameAsWorkingトグルと同じ挙動（％配分の同期のみ）
  // 個人側profile.params.rateSameAsWorking/sigmaSameAsWorkingと同じ、％配分の同期とは
  // 独立したμ・σそれぞれの同期トグル（2026-08-21最終チェックリスト3番で追加）。
  rateSameAsWorking: boolean;
  sigmaSameAsWorking: boolean;
}

export interface CompanyStateSettings {
  effectiveTaxRate: number; // 0-100、デフォルト25、UIヒントで「目安20〜30%」を表示
  // 法人資産のうち投資に回っている分（万円）。μ・σで年次成長する。
  // 旧initialBalanceからリネーム（2026-08-21、最終版指示書3.1）。
  investedBalance: number;
  // 法人保有現金（万円）。成長なし。事業利益の受け皿・取崩の原資になる（デフォルト0）。
  cashBalance: number;
  // 法人の退職（事業引退）年齢。積立期PF/取崩期PFの切替に使う。
  // 個人側profile.params.retAgeとは独立の値（useSimulatorStoreは一切参照しない、3.2節）。
  // 前回実装（2026-08-20 companystate-implementation.md）では個人側retAgeを流用していたが、
  // 今回の指示書で「CompanyStateSettings側で持つ」設計に変更された。指示書文中には
  // 「retirementAge（前回実装済み）はそのまま維持」とあるが、実際には前回実装に本フィールドは
  // 存在しなかったため、今回新規追加した（完了報告に明記）。
  retirementAge: number;
  // 「法人資産を含める」トグルの状態。companyStateStore側で保持する（3.1節）。
  includeInPersonalSimulator: boolean;
}

export interface CompanyState {
  events: CorporateLifeEvent[];
  portfolio: CorporatePortfolio;
  settings: CompanyStateSettings;
}

export const EMPTY_COMPANY_STATE: CompanyState = {
  events: [],
  portfolio: {
    current:    { rows: [] },
    working:    { rows: [] },
    retirement: { rows: [] },
    retirementSameAsWorking: true,
    rateSameAsWorking: true,
    sigmaSameAsWorking: true,
  },
  settings: {
    effectiveTaxRate: 25,
    investedBalance: 0,
    cashBalance: 0,
    retirementAge: 65,
    includeInPersonalSimulator: false,
  },
};

// 法人資産の年次成長シミュレーション結果（1年分のスナップショット）
export interface CorporateYearSnap {
  age: number;
  investedBalance: number;
  cashBalance: number;
  total: number;
  businessProfit: number;
  withdrawal: number;
}
