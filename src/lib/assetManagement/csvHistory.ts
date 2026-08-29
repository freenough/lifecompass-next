import type { AssetHolding } from './types';

// CSV記録履歴対応（追加実装）で個人版・法人版どちらのCSV Importパイプラインからも使う、
// 年月グループ単位の「削除→挿入」置換アルゴリズム。ロックファイル非依存。

export interface DatedHoldings {
  date: string; // 'YYYY-MM'
  holdings: AssetHolding[];
}

/**
 * ページ上の唯一の「表示：個人のみ／合算」トグル（AssetManagementPage.tsxのdisplayScopePref）と
 * 同じ型をここに集約する。CSV Export/Importのスコープ判断は、セクションごとに別のスコープ概念を
 * 新設せず、この共有トグルの値を参照する（csv_yyyymm_format_and_import_scope_fix.md 2章、
 * KENZOさんの方針指定：新しいスコープ概念を作らず既存displayScopePrefを共有する）。
 */
export type AssetDisplayScope = 'personalOnly' | 'combined';

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
 * CSV行を、指定したowner（区分）に属するものとそれ以外の2グループに分類し、それぞれ年月
 * グループ化する。個人ストア向け（本人/配偶者）・法人ストア向け（法人）のどちらのパーサからも
 * この1つを共有し、常に両方（ownGroups・otherGroups）を返す。以前は「表示トグルの値に応じて
 * 他方を無視する」スコープ判定をパース関数側に持たせていたが（personalOnly/combined）、
 * これを廃止しCSVの中身（区分列）だけで判断する設計に単純化した
 * （simplify_csv_scope_and_fix_graph_history_bug.md 2章）。呼び出し側（parseAssetCsv）は
 * ownGroups・otherGroupsの両方をそれぞれ正しい保存先へ適用する。
 */
export function splitGroupsByOwners(
  rows: Array<AssetHolding & { yearMonth: string }>,
  ownOwners: ReadonlyArray<AssetHolding['owner']>,
): { ownGroups: Map<string, AssetHolding[]>; otherGroups: Map<string, AssetHolding[]> } {
  const own = rows.filter((r) => ownOwners.includes(r.owner));
  const other = rows.filter((r) => !ownOwners.includes(r.owner));
  return { ownGroups: groupRowsByYearMonth(own), otherGroups: groupRowsByYearMonth(other) };
}

/**
 * groups（年月ごとのholdings）を、指定したスナップショットストアへ適用する汎用ロジック。
 * personal/hojin両ストアの「自ストア書き込み」「相互ストアへのクロス書き込み」計4箇所で
 * このまま共有する（経路ごとに同じ処理を別々に実装しない。investigation_csv_duplicate_bug_and
 * _reset_feature.mdで確認済みのバグA・バグBと同じパターンを再発させないため）。
 * 中身はreplaceYearMonthGroups→保存→今月ラベルがgroupsに含まれていれば現在holdingsも同期、
 * という既存のapplyHistoryCsv/applyHojinHistoryCsvの「ownグループ書き込み」ロジックの一般化。
 */
export function applyGroupsToStore<TSnapshot extends { date: string }>(
  groups: Map<string, AssetHolding[]>,
  nowYM: string,
  store: {
    loadHistory: () => TSnapshot[];
    saveHistory: (next: TSnapshot[]) => { trimmed: TSnapshot[]; removed: TSnapshot[] };
    toDated: (s: TSnapshot) => AssetHolding[];
    fromDated: (date: string, holdings: AssetHolding[], prev: TSnapshot | undefined) => TSnapshot;
    loadCurrentHoldings: () => AssetHolding[];
    saveCurrentHoldings: (h: AssetHolding[]) => void;
  },
): { holdings: AssetHolding[]; snapshots: TSnapshot[]; removed: TSnapshot[] } {
  if (groups.size === 0) {
    return { holdings: store.loadCurrentHoldings(), snapshots: store.loadHistory(), removed: [] };
  }
  const existing = store.loadHistory();
  const existingByDate = new Map(existing.map((s) => [s.date, s]));
  const existingDated: DatedHoldings[] = existing.map((s) => ({ date: s.date, holdings: store.toDated(s) }));
  const updatedDated = replaceYearMonthGroups(existingDated, groups);
  const updated = updatedDated.map((d) => store.fromDated(d.date, d.holdings, existingByDate.get(d.date)));
  const { trimmed, removed } = store.saveHistory(updated);

  let holdings = store.loadCurrentHoldings();
  const currentGroupRows = groups.get(nowYM);
  if (currentGroupRows) {
    holdings = currentGroupRows;
    store.saveCurrentHoldings(holdings);
  }
  return { holdings, snapshots: trimmed, removed };
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

/** 内部形式'YYYY-MM'をCSV Export用の'YYYYMM'（区切りなし6桁）に変換する。内部データ形式は変更しない。 */
export function toCompactYearMonth(ym: string): string {
  return ym.replace('-', '');
}

/**
 * 確認ダイアログ表示用：年月ラベルの一覧を、件数に応じて列挙／要約する
 * （simplify_csv_scope_and_fix_graph_history_bug.md 3章）。totalCountは呼び出し側が
 * 「個人・法人合わせた合計件数」を渡す想定（合計が6件以上なら、個人・法人それぞれの列挙も
 * 要約表示に切り替えるため。個別のmonths.lengthでは判定しない）。
 */
export function summarizeYearMonths(months: string[], totalCount: number): string {
  const sorted = [...months].sort();
  if (sorted.length === 0) return '';
  if (totalCount <= 5) return sorted.join('、');
  return `${sorted[0]}〜${sorted[sorted.length - 1]}（${sorted.length}件）`;
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
    // CSVに「プロファイルID」列は無い（フェーズ2スコープ）。フェーズ1では常に'default'固定。
    profileId: 'default',
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

  // YYYYMM（区切りなし6桁）：csv_yyyymm_format_and_import_scope_fix.mdで新しい主形式に採用。
  // 区切り文字や月名を含まない単純な数字は表計算ソフトが日付として自動認識しにくいため、
  // Export側はこの形式を出力する（toCompactYearMonth参照）。Import側は後方互換のため、
  // 以下の旧形式（YYYY-MM等）も引き続き受理する。
  let m = /^(\d{4})(\d{2})$/.exec(s);
  if (m) return isValidMonth(m[2]) ? `${m[1]}-${m[2]}` : null;

  m = /^(\d{4})-(\d{2})$/.exec(s);
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
