import type { AssetHolding } from './types';

// CSV記録履歴対応（追加実装）で個人版・法人版どちらのCSV Importパイプラインからも使う、
// 年月グループ単位の「削除→挿入」置換アルゴリズム。ロックファイル非依存。

export interface DatedHoldings {
  date: string; // 'YYYY-MM'
  holdings: AssetHolding[];
}

/**
 * id一致→上書き、id不一致→新規追加（既存の位置は保持し、新規分は末尾に追加）。
 * JSON Import・旧CSV Import（assetManagement/exportImport.tsのmergeHoldings、
 * hojinAssetManagement/exportImport.tsの旧mergeById）と共通のID一致判定ロジック。
 * 経路ごとに同じ種類の判定を別々に実装していたことが、CSV重複バグ・区分クロス混入バグの
 * 双方の一因だったため（調査報告：investigation_csv_duplicate_bug_and_reset_feature.md）、
 * ID一致判定はこの1箇所に集約し、他の場所からはこれを呼び出す形に統一する。
 */
export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const merged = [...existing];
  for (const item of incoming) {
    const idx = merged.findIndex((e) => e.id === item.id);
    if (idx >= 0) merged[idx] = item;
    else merged.push(item);
  }
  return merged;
}

/**
 * CSV行（年月付き）を年月でグループ化する。同一年月グループ内で同一idの行が複数存在する場合は
 * mergeByIdと同じ「id一致→上書き（最後に出現した行が勝つ）」ルールで1件に収束させる
 * （調査報告のバグA：以前はid判定なしに無条件pushしていたため、CSVファイル自体に同一id+
 * 同一年月の行が複数含まれていると、1回のインポートだけで重複行がそのまま保存されていた）。
 */
export function groupRowsByYearMonth(
  rows: Array<AssetHolding & { yearMonth: string }>,
): Map<string, AssetHolding[]> {
  const map = new Map<string, AssetHolding[]>();
  for (const { yearMonth, ...holding } of rows) {
    const existing = map.get(yearMonth);
    map.set(yearMonth, existing ? mergeById(existing, [holding]) : [holding]);
  }
  return map;
}

/**
 * CSV行を、指定したowner（区分）を除外したうえで年月グループ化する。法人セクションのCSV
 * インポートは本人/配偶者行を除外し、個人セクションのCSVインポートは法人行を除外する
 * （調査報告のバグB：以前は法人側にのみ除外フィルタがあり、個人側に対称の実装が
 * 反映されていなかった。同じ種類の処理は両方の呼び出し元がこの1つの関数を共有することで、
 * 今後どちらか一方だけ直して他方に反映し忘れる、という食い違いを構造的に防ぐ）。
 */
export function buildGroupsExcludingOwners(
  rows: Array<AssetHolding & { yearMonth: string }>,
  excludedOwners: ReadonlyArray<AssetHolding['owner']>,
): { groups: Map<string, AssetHolding[]>; ignoredCount: number; affectedYearMonths: string[] } {
  const included = rows.filter((r) => !excludedOwners.includes(r.owner));
  const ignoredCount = rows.length - included.length;
  const groups = groupRowsByYearMonth(included);
  return { groups, ignoredCount, affectedYearMonths: sortedYearMonths(groups) };
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
