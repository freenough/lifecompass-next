import type { AssetHolding } from '@/lib/assetManagement/types';

// 一人法人LPの法人資産ブロック（HojinCompositionDemo.tsx）用の法人デモ資産。
// 人物は資産シミュレーターLPと同じ（個人資産はdemoHoldings.tsのDEMO_HOLDINGSをそのまま使い、
// ここには複製しない）。形は資産管理ツールの法人資産行（AssetManagementPage.tsxのhandleAddHojin）と
// 同じAssetHolding（owner:'corporate'）で、合計をcalcCompositionPercentages()に渡す
// （impl_hitori_hojin_manage_live_demo.md 1節）。
export const DEMO_HOJIN_HOLDINGS: AssetHolding[] = [
  { id: 'lp-demo-hojin-deposit',    profileId: 'default', owner: 'corporate', accountCategory: '法人預金',     assetClass: '現金',     amount: 300, updatedAt: '2026-01-01' },
  { id: 'lp-demo-hojin-securities', profileId: 'default', owner: 'corporate', accountCategory: '法人証券口座', assetClass: '全世界株', amount: 200, updatedAt: '2026-01-01' },
];

export const DEMO_HOJIN_HOLDINGS_TOTAL = DEMO_HOJIN_HOLDINGS.reduce((sum, h) => sum + h.amount, 0);
