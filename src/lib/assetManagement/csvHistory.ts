import type { AssetHolding } from './types';

// CSV記録履歴対応（追加実装）で個人版・法人版どちらのCSV Importパイプラインからも使う、
// 年月グループ単位の「削除→挿入」置換アルゴリズム。ロックファイル非依存。

export interface DatedHoldings {
  date: string; // 'YYYY-MM'
  holdings: AssetHolding[];
}

/** CSV行（年月付き）を年月でグループ化する。同一年月の行は出現順に配列へ積み上げる。 */
export function groupRowsByYearMonth(
  rows: Array<AssetHolding & { yearMonth: string }>,
): Map<string, AssetHolding[]> {
  const map = new Map<string, AssetHolding[]>();
  for (const { yearMonth, ...holding } of rows) {
    const arr = map.get(yearMonth);
    if (arr) arr.push(holding);
    else map.set(yearMonth, [holding]);
  }
  return map;
}

/**
 * existingの各要素のうち、groupsに同じdateが存在するものは「その年月のholdingsをCSVの内容だけに
 * 総入れ替え」する（削除→挿入）。groupsにしかないdateは新規追加。groupsに無いdateは一切触れない。
 * 戻り値はdate昇順。
 */
export function replaceYearMonthGroups(
  existing: DatedHoldings[],
  groups: Map<string, AssetHolding[]>,
): DatedHoldings[] {
  const byDate = new Map(existing.map((e) => [e.date, e]));
  for (const [date, holdings] of groups) {
    byDate.set(date, { date, holdings });
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 確認ダイアログ表示用：groupsに含まれる年月ラベルの一覧（昇順）。 */
export function sortedYearMonths(groups: Map<string, AssetHolding[]>): string[] {
  return Array.from(groups.keys()).sort();
}

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/** CSV行の各フィールドからAssetHoldingを構築する。IDが空文字なら新規id、更新日が空なら現在時刻で補完。 */
export function rowToHolding(fields: {
  id: string;
  owner: AssetHolding['owner'];
  accountCategory: string;
  assetClass: string;
  amount: number;
  updatedAt: string;
}): AssetHolding {
  return {
    id: fields.id || generateId(),
    owner: fields.owner,
    accountCategory: fields.accountCategory,
    assetClass: fields.assetClass,
    amount: fields.amount,
    updatedAt: fields.updatedAt || new Date().toISOString(),
  };
}
