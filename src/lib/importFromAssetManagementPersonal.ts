// 資産管理ツール（assetManagement、ロック対象外）の個人保有資産データを、個人側①現在PF
// （ProfileV3.portfolio.current、ロック対象）に変換するワンショットの関数
// （instruction_phase2_companystate_rearchitecture.md 5.2節）。法人側importFromAssetManagement.ts
// と同じ設計（明示的なprofileId引数、その場限りの一括上書き、自動同期なし）。
//
// 個人側は法人側と異なり、口座区分（NISA/iDeCo/特定口座）＋本人/配偶者の組み合わせで
// 分解して返す必要がある（法人側はCompanyStateの①現在PFが単一のポートフォリオのため
// 分解不要だった）。simulatorStore.tsのimportPersonalAssetsアクションがこの戻り値を
// 1回のsetでまとめて反映する。

import { loadHoldings } from './assetManagement/storage';
import type { AssetHolding } from './assetManagement/types';
import type { AssetRow } from './profile';

export interface ImportedPersonalAssets {
  bCash: number;
  spCashBal: number;
  nisa: AssetRow[];
  ideco: AssetRow[];
  tax: AssetRow[];
  spNisa: AssetRow[];
  spIdeco: AssetRow[];
  spTax: AssetRow[];
}

// 5.2節のマッピング表：
// 現金（本人）→bCash／現金（配偶者）→spCashBal
// NISA/iDeCo/特定口座（本人/配偶者）→対応する行配列
// その他（本人/配偶者）→特定口座に合算（資産クラスは元のassetClass文字列のまま）
function toRows(holdings: AssetHolding[]): AssetRow[] {
  const amountByClass = new Map<string, number>();
  for (const h of holdings) {
    amountByClass.set(h.assetClass, (amountByClass.get(h.assetClass) ?? 0) + (h.amount || 0));
  }
  return Array.from(amountByClass.entries()).map(([assetClass, amount]) => ({
    assetClass,
    pct: 0, // 個人側①現在PFはamountのみを使う（simulatorStore.tsのupdatePortfolioと同じ扱い）
    amount,
  }));
}

export function importFromAssetManagementPersonal(profileId: string): ImportedPersonalAssets {
  const holdings = loadHoldings().filter(h => h.profileId === profileId);

  const byOwnerCategory = (owner: AssetHolding['owner'], category: string) =>
    holdings.filter(h => h.owner === owner && h.accountCategory === category);

  const bCash = byOwnerCategory('personal', '現金').reduce((s, h) => s + (h.amount || 0), 0);
  const spCashBal = byOwnerCategory('personal_spouse', '現金').reduce((s, h) => s + (h.amount || 0), 0);

  const nisa = toRows(byOwnerCategory('personal', 'NISA'));
  const ideco = toRows(byOwnerCategory('personal', 'iDeCo'));
  // その他（本人）は特定口座に合算する。
  const tax = toRows([...byOwnerCategory('personal', '特定口座'), ...byOwnerCategory('personal', 'その他')]);

  const spNisa = toRows(byOwnerCategory('personal_spouse', 'NISA'));
  const spIdeco = toRows(byOwnerCategory('personal_spouse', 'iDeCo'));
  const spTax = toRows([...byOwnerCategory('personal_spouse', '特定口座'), ...byOwnerCategory('personal_spouse', 'その他')]);

  return { bCash, spCashBal, nisa, ideco, tax, spNisa, spIdeco, spTax };
}
