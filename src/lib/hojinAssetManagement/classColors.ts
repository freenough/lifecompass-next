// 個人資産管理ツール（classColors.ts、ロック対象）の配色ルールをそのまま複製（6章：新しい配色ルールを作らない）。
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
  '暗号資産': '#c2185b',
  '保険': '#5c6bc0',
};

const FALLBACK_COLOR = '#c3c2b7';

export function getAssetClassColor(assetClass: string): string {
  return ASSET_CLASS_COLOR_MAP[assetClass] ?? FALLBACK_COLOR;
}
