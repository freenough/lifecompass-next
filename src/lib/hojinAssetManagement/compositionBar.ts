// 「個人資産＋法人保有資産」内訳バー（HojinAssetCompositionBar.tsx）の計算ロジック。
// scripts/verify-*.jsから直接importして回帰テストできるようにする
// （instruction_asset_management_page_layout_review.md 0.4節：目標資産額に対する比率ではなく、
// 個人資産＋法人保有資産の合計を100%とした内訳のみを示す方式への変更）。

export interface CompositionPercentages {
  personalPct: number;
  hojinPct: number;
}

/** 個人資産＋法人保有資産の合計を100%として、それぞれの割合を返す（バーは常に満幅）。 */
export function calcCompositionPercentages(personalTotal: number, hojinTotal: number): CompositionPercentages {
  const barBase = Math.max(personalTotal + hojinTotal, 1);
  const personalPct = (personalTotal / barBase) * 100;
  return { personalPct, hojinPct: 100 - personalPct };
}
