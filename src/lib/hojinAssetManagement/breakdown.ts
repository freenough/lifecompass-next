// 個人資産管理ツール（breakdown.ts、ロック対象）と同じロジックを複製。
// 法人保有資産・個人資産パネルの両方の型がassetClass+amountを持つ構造的部分型のため、
// この関数は両方の配列（あるいは結合した配列）にそのまま使える。
interface AssetClassAmount {
  assetClass: string;
  amount: number;
}

/** 資産クラス別の構成比（%）を返す。合計0円のときは空マップ。 */
export function classBreakdown(holdings: AssetClassAmount[]): Map<string, number> {
  const total = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  const map = new Map<string, number>();
  if (total === 0) return map;
  holdings.forEach((h) => {
    if (!h.amount) return;
    map.set(h.assetClass, (map.get(h.assetClass) ?? 0) + (h.amount / total) * 100);
  });
  return map;
}
