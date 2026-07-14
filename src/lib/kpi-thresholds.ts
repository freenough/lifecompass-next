export type KpiVariant = 'good' | 'warn' | 'danger';

/**
 * 資産寿命の色分け（KpiGrid.tsx・StickyKpiBar.tsx共通）。
 * 枯渇なし=緑／終端年齢(lifeEx)の5年以内に枯渇=黄／それより早く枯渇=赤。
 * 閾値(5年)は今後の運用で調整される可能性があるため、両コンポーネントから
 * この関数のみを参照し、複製しないこと。
 */
export function assetLongevityVariant(dA: number | null, lifeEx: number): KpiVariant {
  if (dA == null) return 'good';
  return dA >= lifeEx - 5 ? 'warn' : 'danger';
}

/**
 * FIRE安全度の色分け（KpiGrid.tsx・StickyKpiBar.tsx共通）。
 * 退職後/FIRE達成後最低充足率(minRatio)が100%以上=緑／80〜100%未満=黄／80%未満=赤。
 * KpiGrid.tsx側の表示は四捨五入した値を使うため、判定も同じ丸め後の値で行う
 * （境界値でのgood/warn食い違いを防ぐため）。
 */
export function fireSafetyVariant(minRatio: number | null): KpiVariant {
  if (minRatio == null) return 'danger';
  const rounded = Math.round(minRatio);
  if (rounded >= 100) return 'good';
  if (rounded >= 80) return 'warn';
  return 'danger';
}
