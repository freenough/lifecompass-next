// 個人資産管理ツール（src/lib/assetManagement/types.ts、ロック対象）とは別物。
// import禁止・複製方針のため、この法人資産管理ツール専用ディレクトリ内で完全に独立して定義する。

export interface HojinAssetHolding {
  id: string;
  accountCategory: '法人預金' | '法人証券口座' | '保険積立金' | '貸付金・仮払金' | 'その他法人資産';
  assetClass: string;   // categories.tsのASSET_CLASSES参照（個人側と同じ複製元を再利用）
  amount: number;        // 万円単位
  updatedAt: string;
}

// 法人ツール内の個人資産パネル用（個人側AssetHoldingと同じ構造の独立コピー）。
// corporateは選択肢に含めない（個人資産パネルはあくまで個人資産のみを扱う）。
export interface HojinCopiedPersonalHolding {
  id: string;
  owner: 'personal' | 'personal_spouse';
  accountCategory: string; // '現金' | 'NISA' | 'iDeCo' | '特定口座' | 'その他'
  assetClass: string;
  amount: number;
  updatedAt: string;
}

export interface HojinAssetSnapshot {
  date: string; // 'YYYY-MM'
  hojinHoldings: HojinAssetHolding[];
  personalHoldings: HojinCopiedPersonalHolding[];
  personalLastUpdatedAt: string; // 個人資産パネルの最終更新日時（インポートまたは手動編集）
  totalHojinAmount: number;
  totalPersonalAmount: number;
}
