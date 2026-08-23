// フェーズ1（資産管理ツール統合）で、保有資産の型は個人・法人で共通の
// AssetHolding（src/lib/assetManagement/types.ts）に一本化した。
// HojinAssetHolding・HojinCopiedPersonalHoldingは廃止。
import type { AssetHolding } from '@/lib/assetManagement/types';

export interface HojinAssetSnapshot {
  date: string; // 'YYYY-MM'
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[]; // 「記録する」押下時点の個人資産のライブ値を自動キャプチャしたもの
  totalHojinAmount: number;
  totalPersonalAmount: number;
  // フェーズ2以降のプロファイル機能に備えたスキーマ下地（フェーズ1では常に'default'固定）。
  profileId: string;
}
