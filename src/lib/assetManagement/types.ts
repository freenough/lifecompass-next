// AssetRow（src/lib/profile.ts、ロック対象）とは別物。混同を避けるため、
// この資産管理ツール専用のディレクトリ内で完全に独立して定義する。

export interface AssetHolding {
  id: string;
  owner: 'personal' | 'personal_spouse' | 'corporate'; // corporateは将来のHitori-Hojin連携用の予約値（Phase1のUIでは選択不可）
  accountCategory: string; // '現金' | 'NISA' | 'iDeCo' | '特定口座' | 'その他'（categories.tsのACCOUNT_CATEGORIES参照）
  assetClass: string;      // categories.tsのASSET_CLASSES参照
  amount: number;          // 万円単位
  updatedAt: string;       // ISO日付文字列
  // AssetSnapshot/HojinAssetSnapshotと同じ、フェーズ2以降のプロファイル機能に備えたスキーマ下地
  // （フェーズ1では常に'default'固定。関連するUI・切替ロジックはフェーズ1では実装しない）。
  profileId: string;
}

export interface AssetSnapshot {
  date: string;             // 'YYYY-MM'形式（月次判定に使用、monthlyCheck.ts参照）
  holdings: AssetHolding[];
  totalAmount: number;
  // フェーズ2以降のプロファイル機能に備えたスキーマ下地（フェーズ1では常に'default'固定）。
  // 関連するUI・切替ロジックはフェーズ1では実装しない。
  profileId: string;
}
