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

// 差し戻し対応（remand_csv_date_parsing_and_scope_fix.md 3章）：表計算ソフトでCSVを開いて
// 保存すると、"2026-08"のような文字列が日付として自動認識され"Aug-26"等の別形式に変換されて
// しまうことがある。これを検出せず新規グループとして無条件受理すると、同じ月が別グループに
// 分裂して二重登録される（実機で確認済みの不具合）。対応する形式だけをYYYY-MMへ正規化し、
// それ以外は「弾く」（新規グループとして受理しない）。曖昧な形式を許容側に倒すことは絶対にしない。
const MONTH_ABBR_TO_NUM: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** 2桁年を4桁へ変換する（Excel等の一般的な慣例：00-79→2000年代、80-99→1900年代）。 */
function twoDigitYearTo4(yy: string): string {
  const n = Number(yy);
  return String(n <= 79 ? 2000 + n : 1900 + n);
}

/**
 * 年月列の値を'YYYY-MM'に正規化する。厳密なYYYY-MM・YYYY/MM、表計算ソフトが生成しがちな
 * 月名略称+西暦（Aug-26／Aug-2026／Aug/26）、スラッシュ区切りの完全な日付（YYYY/M/D・
 * M/D/YYYY、日は無視）のみを受理する。それ以外はnullを返し、呼び出し側でインポート自体を
 * 中断させる（黙って誤った年月として取り込む、または別グループとして分裂させることはしない）。
 */
export function normalizeYearMonth(raw: string): string | null {
  const s = raw.trim();

  let m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return isValidMonth(m[2]) ? `${m[1]}-${m[2]}` : null;

  m = /^(\d{4})\/(\d{2})$/.exec(s);
  if (m) return isValidMonth(m[2]) ? `${m[1]}-${m[2]}` : null;

  m = /^([A-Za-z]{3})[-/](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const mon = MONTH_ABBR_TO_NUM[m[1].toLowerCase()];
    if (!mon) return null;
    const year = m[2].length === 2 ? twoDigitYearTo4(m[2]) : m[2];
    return `${year}-${mon}`;
  }

  // YYYY/M/D（先頭が4桁＝年、日は無視）
  m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (m) {
    const mm = String(Number(m[2])).padStart(2, '0');
    return isValidMonth(mm) ? `${m[1]}-${mm}` : null;
  }

  // M/D/YYYY（米国式、日は無視）
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const mm = String(Number(m[1])).padStart(2, '0');
    return isValidMonth(mm) ? `${m[3]}-${mm}` : null;
  }

  return null;
}

function isValidMonth(mm: string): boolean {
  const n = Number(mm);
  return n >= 1 && n <= 12;
}
