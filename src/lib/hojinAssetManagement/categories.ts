// 個人資産管理ツール（src/lib/assetManagement/categories.ts、ロック対象）とはimport禁止・
// 複製方針（hitori-hojin全体の既存ルール）。値は完全に同じものを複製している。

export const HOJIN_ACCOUNT_CATEGORIES = [
  '法人預金', '法人証券口座', '保険積立金', '貸付金・仮払金', 'その他法人資産',
] as const;
export type HojinAccountCategory = (typeof HOJIN_ACCOUNT_CATEGORIES)[number];

// 個人資産パネルのカテゴリ（個人資産管理ツール本体の確定分類と同じ、5.1節）。
export const PERSONAL_ACCOUNT_CATEGORIES = ['現金', 'NISA', 'iDeCo', '特定口座', 'その他'] as const;
export type PersonalAccountCategory = (typeof PERSONAL_ACCOUNT_CATEGORIES)[number];

export interface AssetClassDef {
  key: string;
  mu?: number;
  sigma?: number;
  group?: string;
}

// src/lib/assetManagement/categories.tsのASSET_CLASSES（＝profile.ts複製元）をそのまま複製。
// calcMu等のロジックは複製・呼び出ししない（このツールは将来予測を行わないため不要）。
export const ASSET_CLASSES: AssetClassDef[] = [
  { key: '全世界株',    mu: 6.83, sigma: 18.89, group: 'stock'    },
  { key: '先進国株',    mu: 6.75, sigma: 19.01, group: 'stock'    },
  { key: '新興国株',    mu: 8.09, sigma: 21.58, group: 'stock'    },
  { key: '日本株',      mu: 8.33, sigma: 17.10, group: 'stock'    },
  { key: '先進国債券',  mu: 2.70, sigma:  6.38, group: 'bond'     },
  { key: '日本債券',    mu: 2.14, sigma:  2.79, group: 'bond'     },
  { key: '先進国REIT',  mu: 7.46, sigma: 18.49, group: 'reit_dev' },
  { key: '日本REIT',    mu: 4.5,  sigma: 16.2,  group: 'reit_jp'  },
  { key: 'ゴールド',    mu: 4.80, sigma: 15.29, group: 'gold'     },
  { key: '短期債・MMF', mu: 2.41, sigma:  1.54, group: 'cash'     },
  { key: '不動産' },
  { key: '暗号資産' },
  { key: '保険' },
  { key: 'その他' },
];

export const CASH_ASSET_CLASS = '現金';
export const INSURANCE_ASSET_CLASS = '保険';

const OTHER_CATEGORY_KEYS = ['不動産', '暗号資産', '保険', 'その他'];
const STANDARD_CLASSES = ASSET_CLASSES.filter((a) => !OTHER_CATEGORY_KEYS.includes(a.key));
const OTHER_CATEGORY_CLASSES = OTHER_CATEGORY_KEYS.map((key) => ASSET_CLASSES.find((a) => a.key === key)!);

// 法人カテゴリ→選択可能な資産クラス（4章で確定）。
// 空配列＝資産クラスのドロップダウン自体を出さず、固定値を使う
// （法人預金/貸付金・仮払金は'現金'、保険積立金は'保険'。実際の固定値割り当ては
// HOJIN_CATEGORY_DEFAULT_ASSET_CLASSを参照）。
export const ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY: Record<HojinAccountCategory, AssetClassDef[]> = {
  '法人預金': [],
  '法人証券口座': STANDARD_CLASSES,
  '保険積立金': [],
  '貸付金・仮払金': [],
  'その他法人資産': OTHER_CATEGORY_CLASSES,
};

// 法人カテゴリに新規行を追加したときのデフォルト資産クラス（固定カテゴリの実際の固定値もここで定義）。
export const HOJIN_CATEGORY_DEFAULT_ASSET_CLASS: Record<HojinAccountCategory, string> = {
  '法人預金': CASH_ASSET_CLASS,
  '法人証券口座': STANDARD_CLASSES[0]?.key ?? '全世界株',
  '保険積立金': INSURANCE_ASSET_CLASS,
  '貸付金・仮払金': CASH_ASSET_CLASS,
  'その他法人資産': OTHER_CATEGORY_CLASSES[0]?.key ?? '不動産',
};

// 個人資産パネルのカテゴリ→選択可能な資産クラス（個人資産管理ツール本体のマッピングを複製）。
export const ALLOWED_ASSET_CLASSES_BY_PERSONAL_CATEGORY: Record<PersonalAccountCategory, AssetClassDef[]> = {
  '現金': [],
  'NISA': STANDARD_CLASSES,
  'iDeCo': STANDARD_CLASSES,
  '特定口座': STANDARD_CLASSES,
  'その他': OTHER_CATEGORY_CLASSES,
};

export const PERSONAL_CATEGORY_DEFAULT_ASSET_CLASS: Record<PersonalAccountCategory, string> = {
  '現金': CASH_ASSET_CLASS,
  'NISA': STANDARD_CLASSES[0]?.key ?? '全世界株',
  'iDeCo': STANDARD_CLASSES[0]?.key ?? '全世界株',
  '特定口座': STANDARD_CLASSES[0]?.key ?? '全世界株',
  'その他': OTHER_CATEGORY_CLASSES[0]?.key ?? '不動産',
};

// 表示ラベルの上書き（個人側と同じ仕組みを複製、現時点では上書き対象なし）。
const ASSET_CLASS_DISPLAY_LABELS: Record<string, string> = {};

export function getAssetClassLabel(assetClass: string): string {
  return ASSET_CLASS_DISPLAY_LABELS[assetClass] ?? assetClass;
}
