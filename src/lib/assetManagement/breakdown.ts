import type { AssetHolding } from './types';

/** 資産クラス別の構成比（%）を返す。合計0円のときは空マップ。 */
export function classBreakdown(holdings: AssetHolding[]): Map<string, number> {
  const total = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  const map = new Map<string, number>();
  if (total === 0) return map;
  holdings.forEach((h) => {
    if (!h.amount) return;
    map.set(h.assetClass, (map.get(h.assetClass) ?? 0) + (h.amount / total) * 100);
  });
  return map;
}
