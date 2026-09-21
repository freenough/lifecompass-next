import type { AssetHolding } from '@/lib/assetManagement/types';

// DEMO_PROFILE（demoProfile.ts）の口座残高（acct.nisa.bal=400／acct.ideco.bal=300／
// acct.tax.bal=500／acct.cash.bal=300、合計1,500万）と金額ベースで一致させたダミー内訳。
// DEMO_PROFILE（SimParamsのAccountConfig）には口座ごとの資産クラス情報は存在しないため、
// 口座→資産クラスの対応づけ（NISA→全世界株／iDeCo→先進国株／特定口座→日本株／現金→現金）は
// 実装側で妥当な形で決めたもの（claude_instruction_asset_card_redesign_unified.md 1節）。
export const DEMO_HOLDINGS: AssetHolding[] = [
  { id: 'lp-demo-nisa',  profileId: 'default', owner: 'personal', accountCategory: 'NISA',    assetClass: '全世界株', amount: 400, updatedAt: '2026-01-01' },
  { id: 'lp-demo-ideco', profileId: 'default', owner: 'personal', accountCategory: 'iDeCo',   assetClass: '先進国株', amount: 300, updatedAt: '2026-01-01' },
  { id: 'lp-demo-tax',   profileId: 'default', owner: 'personal', accountCategory: '特定口座', assetClass: '日本株',   amount: 500, updatedAt: '2026-01-01' },
  { id: 'lp-demo-cash',  profileId: 'default', owner: 'personal', accountCategory: '現金',    assetClass: '現金',     amount: 300, updatedAt: '2026-01-01' },
];

export const DEMO_HOLDINGS_TOTAL = DEMO_HOLDINGS.reduce((sum, h) => sum + h.amount, 0);
