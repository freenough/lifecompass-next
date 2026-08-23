// 口座カテゴリ（確定・5種）。表記は既存コードベース（PortfolioPanel.tsx ACCT_LABELS・
// YearlyTable.tsx等）の表記ゆれに厳密に一致させる：NISA（半角英大文字）、iDeCo（公式表記）、
// 特定口座（漢字）。「課税口座」という語は使用禁止（AssetChart.tsxの取り崩し戦略名
// 'taxable_first: 課税口座優先'と混同するため）。
export const ACCOUNT_CATEGORIES = ['現金', 'NISA', 'iDeCo', '特定口座', 'その他'] as const;
export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];

export interface AssetClassDef {
  key: string;
  mu?: number;
  sigma?: number;
  group?: string;
}

// src/lib/profile.ts の ASSET_CLASSES（31-42行目）を値としてそのまま複製したもの。
// calcMu/calcPortfolioMetrics等のロジックは複製・呼び出ししない（このツールは将来予測を
// 行わないためmu/sigma/相関係数は機能上不要）。mu/sigma/groupは複製元との値照合用に
// フィールドだけ保持しており、このツール自体は参照・計算に使わない。
// 複製元との一致確認方法：profile.tsのASSET_CLASSESとこの配列の先頭10件をkey/mu/sigma/group
// で目視突き合わせる（scripts/full-verify.js等で自動照合してもよいが、値が変わるのは
// LTCMA年次改訂時のみのため、現状は手動確認で十分と判断）。
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
  // このツール専用の追加（既存シミュレーター側のASSET_CLASSESには追加しない、別タスク）。
  // 将来予測を行わないため期待リターン・ボラティリティ・相関係数の設定が不要で追加コストが低い。
  { key: '不動産' },
  // 旧・修正指示（display_and_snapshot）で「その他（暗号資産・保険等）」として1つに
  // まとめていたが、暗号資産・保険は将来profile.ts側へ反映する際に期待リターン・
  // ボラティリティの前提が大きく異なるため、今回（trend_chart_and_asset_split 5章）で
  // 独立した選択肢に分割した。内部値'その他'は変更せず、汎用の受け皿として残す。
  { key: '暗号資産' },
  { key: '保険' },
  { key: 'その他' },
];

// 「現金」カードの資産クラス固定値。ASSET_CLASSES一覧には含めない（現金カード専用の
// 特別値で、ドロップダウンの選択肢にはならない。1章のバグ修正で導入）。
export const CASH_ASSET_CLASS = '現金';

const OTHER_CATEGORY_KEYS = ['不動産', '暗号資産', '保険', 'その他'];
const STANDARD_CLASSES = ASSET_CLASSES.filter((a) => !OTHER_CATEGORY_KEYS.includes(a.key));
// 5.1節の並び順（不動産／暗号資産／保険／その他）どおりに固定する。
const OTHER_CATEGORY_CLASSES = OTHER_CATEGORY_KEYS.map(
  (key) => ASSET_CLASSES.find((a) => a.key === key)!
);

// 口座カテゴリ→選択可能な資産クラスのマッピング（3.2節で確定、5章でその他を4択に更新）。
// 現金は空配列＝資産クラスのドロップダウン自体を出さない（CASH_ASSET_CLASSを内部固定値として使う）。
export const ALLOWED_ASSET_CLASSES_BY_CATEGORY: Record<AccountCategory, AssetClassDef[]> = {
  '現金': [],
  'NISA': STANDARD_CLASSES,
  'iDeCo': STANDARD_CLASSES,
  '特定口座': STANDARD_CLASSES,
  'その他': OTHER_CATEGORY_CLASSES,
};

// 表示ラベルの上書き。内部の保存値（assetClass文字列）は変更せず、UI表示のみ変更する。
// 5章：「その他」を4択に分割したため「その他（暗号資産・保険等）」という特別変換は不要になり削除。
// 現時点では上書き対象なし（将来また表示名だけ変えたい場合のためにこの仕組み自体は残す）。
const ASSET_CLASS_DISPLAY_LABELS: Record<string, string> = {};

export function getAssetClassLabel(assetClass: string): string {
  return ASSET_CLASS_DISPLAY_LABELS[assetClass] ?? assetClass;
}

// ---------------------------------------------------------------------------
// 法人（一人法人）資産管理ツール向けの分類（フェーズ1で個人版に一本化、
// src/lib/hojinAssetManagement/categories.ts は廃止）。ASSET_CLASSESは上記と共通。
// ---------------------------------------------------------------------------

export const HOJIN_ACCOUNT_CATEGORIES = [
  '法人預金', '法人証券口座', '保険積立金', '貸付金・仮払金', 'その他法人資産',
] as const;
export type HojinAccountCategory = (typeof HOJIN_ACCOUNT_CATEGORIES)[number];

export const INSURANCE_ASSET_CLASS = '保険';

// 法人カテゴリ→選択可能な資産クラス。空配列＝資産クラスのドロップダウン自体を出さず、
// 固定値を使う（法人預金/貸付金・仮払金は'現金'、保険積立金は'保険'。実際の固定値割り当ては
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
