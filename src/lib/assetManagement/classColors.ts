// 資産クラスごとの固定配色マッピング。円グラフ・凡例・テーブルの色ドット、すべてがこの
// マッピングだけを参照する（2.2節：保有資産の組み合わせによって色がズレる不具合の修正）。
//
// 先頭8色はdataviz skillの検証済みカテゴリカルパレット（8スロット、adjacent pairlistで
// light面 ALL PASS。node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300,#4a3aa7,#e34948" --mode light
// で確認済み）をそのまま採用し、ASSET_CLASSES（profile.ts複製元）の並び順に固定割り当てした。
// 残り5色（ゴールド以降）は検証済み8スロットの範囲外のため、明確に異なる色相・明度を
// 手動で選定した補助色（凡例・色ドット・ツールチップという二次エンコーディングが常設されて
// いるため、色だけに頼らない設計になっている）。
export const ASSET_CLASS_COLOR_MAP: Record<string, string> = {
  '全世界株': '#2a78d6',
  '先進国株': '#eb6834',
  '新興国株': '#1baf7a',
  '日本株': '#eda100',
  '先進国債券': '#e87ba4',
  '日本債券': '#008300',
  '先進国REIT': '#4a3aa7',
  '日本REIT': '#e34948',
  'ゴールド': '#b8860b',
  '短期債・MMF': '#0d366b',
  '不動産': '#6b4423',
  'その他': '#898781',
  '現金': '#5b8a9e',
  // 5章で追加。既存8色（検証済み）とは別に、明確に異なる色相を手動選定した補助色。
  '暗号資産': '#c2185b',
  '保険': '#5c6bc0',
};

const FALLBACK_COLOR = '#c3c2b7';

export function getAssetClassColor(assetClass: string): string {
  return ASSET_CLASS_COLOR_MAP[assetClass] ?? FALLBACK_COLOR;
}
