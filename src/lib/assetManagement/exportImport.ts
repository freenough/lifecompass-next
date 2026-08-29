import type { AssetHolding, AssetSnapshot } from './types';
import type { HojinAssetSnapshot } from '../hojinAssetManagement/types';
import { loadHoldings, saveHoldings, loadSnapshots, saveSnapshots, loadTargetAmount, saveTargetAmount, personalStoreAdapter } from './storage';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots as loadHojinSnapshots,
  saveSnapshots as saveHojinSnapshots,
  loadTargetAmount as loadHojinTargetAmount,
  saveTargetAmount as saveHojinTargetAmount,
  loadPersonalizationRatio,
  savePersonalizationRatio,
  hojinStoreAdapter,
} from '../hojinAssetManagement/storage';
import { loadTransferLog, mergeTransferLog, type TransferLogEntry } from '../hojinAssetManagement/transferLog';
import { findPersonalSnapshot } from '../hojinAssetManagement/personalHistory';
import { toYearMonth } from './monthlyCheck';
import {
  rowToHolding,
  normalizeYearMonth,
  mergeById,
  splitGroupsByOwners,
  applyGroupsToStore,
  toCompactYearMonth,
  sortedYearMonths,
} from './csvHistory';

// simplify_csv_scope_and_fix_graph_history_bug.md 2章：Export/Importを表示トグル
// （AssetDisplayScope）から完全に切り離す。Exportは常に個人・法人の全データ（保有資産＋記録
// 履歴すべて）を出力し、Importは各行／各キーの「区分」だけを見て、対応するストアにのみ書き込む。
// 個人セクション用・法人セクション用に分かれていた2つのexportImport.tsを、依存の向きが既に
// こちら（assetManagement）→hojinAssetManagement/storageだった経緯を踏まえこちらに一本化する
// （hojinAssetManagement/exportImport.tsは削除）。

interface AssetManagementExportPayload {
  version: 1;
  exportedAt: string;
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  hojinHoldings: AssetHolding[];
  hojinSnapshots: HojinAssetSnapshot[];
  // json_export_completeness_and_history_bug.md 2章：「完全バックアップ」の実態に合わせて追加。
  targetAmount: number;
  hojinTargetAmount: number;
  personalizationRatio: number;
  transferLog: TransferLogEntry[];
}

const OWNER_LABELS: Record<AssetHolding['owner'], string> = {
  personal: '本人',
  personal_spouse: '配偶者',
  corporate: '法人',
};
const OWNER_LABEL_TO_VALUE: Record<string, AssetHolding['owner']> = {
  '本人': 'personal',
  '配偶者': 'personal_spouse',
  '法人': 'corporate',
};

// ダウンロードファイル名は内部の開発コードネーム「lifecompass」を含めない。既存の資産
// シミュレーター本体のCSVエクスポート（YearlyTable.tsx: `asset_simulation_${date}.csv`）と
// 同じ命名規則（英語スネークケース・日付サフィックス、ブランド名を含めない）に揃える。
const FILENAME_PREFIX = 'asset_management';

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * hojinSnapshotsが持つpersonalHoldings／totalPersonalAmount（「記録する」を法人トグルON時に
 * 押した月だけキャプチャされる表示用の複製、記録タイミングによって歯抜けになりうる）を、
 * 個人ストア自身の真の記録履歴（personalSnapshots）で該当年月ごとに上書きする。一致する
 * エントリが無い月はそのまま（データを失わない）。CSV Export（exportToCsv）と同じ根本原因の
 * バグをJSON Exportにも適用する（json_export_completeness_and_history_bug.md 1章）。
 */
export function withCorrectedHojinSnapshots(hojinSnapshots: HojinAssetSnapshot[], personalSnapshots: AssetSnapshot[]): HojinAssetSnapshot[] {
  return hojinSnapshots.map((s) => {
    const match = findPersonalSnapshot(personalSnapshots, s.date);
    if (!match) return s;
    return { ...s, personalHoldings: match.holdings, totalPersonalAmount: match.totalAmount };
  });
}

/**
 * 個人・法人の保有資産＋記録履歴＋設定値（目標資産額・個人化想定比率）＋移転履歴ログすべてを
 * 含む完全バックアップを出力する。スコープの概念はない。設定値・移転履歴ログはReact stateとして
 * 引き回されていないため、ストレージから直接読み出す（json_export_completeness_and_history_bug.md
 * 2章）。
 */
export function exportToJson(
  holdings: AssetHolding[],
  snapshots: AssetSnapshot[],
  hojinHoldings: AssetHolding[],
  hojinSnapshots: HojinAssetSnapshot[],
): void {
  const payload: AssetManagementExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    holdings,
    snapshots,
    hojinHoldings,
    hojinSnapshots: withCorrectedHojinSnapshots(hojinSnapshots, snapshots),
    targetAmount: loadTargetAmount(),
    hojinTargetAmount: loadHojinTargetAmount(),
    personalizationRatio: loadPersonalizationRatio(),
    transferLog: loadTransferLog(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${todayStamp()}.json`);
}

// CSVはこの並びで固定。IDを1列目に含めるのは、CSV Importで自社Export形式のみを
// 対象にidベースのマージをそのまま再利用するため（IDが無いと「同じCSVを2回取り込むと行が
// 倍増する」という重複バグを生む）。「区分」列（本人/配偶者/法人）1本で、個人・法人どちらの
// 行かを判別する（区分の値だけを見て振り分ける、というのが2章の設計方針の核心）。
// 「年月」列はYYYYMM形式（区切りなし6桁）で出力する（表計算ソフトの自動日付変換対策）。
const CSV_HEADERS = ['ID', '年月', '口座カテゴリ', '資産クラス', '区分', '金額(万円)', '更新日'];
// 「年月」列を追加する前の旧6列CSVも後方互換で読み込めるようにする。年月ラベルを持たないため、
// 全行を「今月扱い」として現在のholdingsのみへインポートする（スナップショットには触れない）。
const LEGACY_CSV_HEADERS = ['ID', '口座カテゴリ', '資産クラス', '保有者', '金額(万円)', '更新日'];
const CSV_IMPORT_ERROR_MESSAGE = '対応していないCSV形式です。自社のCSVエクスポート機能で出力したファイルを選択してください。';

function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** ダブルクォート囲み・エスケープ("")に対応した簡易CSV1行パーサ（自社Export形式限定のスコープのため最小限）。 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * 個人・法人の現在の保有資産（今月ラベル）＋両ストアの全記録履歴（今月分と重複する場合は
 * 現在値を優先し履歴側は除外）を年月ラベル付きでCSV出力する。法人側の過去履歴は、法人
 * スナップショット自身のhojinHoldingsフィールドのみを使う（personalHoldings複製は一切
 * 参照しない。個人側の過去履歴は必ずsnapshots＝個人ストア自身の真の記録履歴から出力する）。
 */
export function exportToCsv(
  holdings: AssetHolding[],
  snapshots: AssetSnapshot[],
  hojinHoldings: AssetHolding[],
  hojinSnapshots: HojinAssetSnapshot[],
): void {
  const nowYM = toYearMonth(new Date());
  const nowYMCompact = toCompactYearMonth(nowYM);
  const currentPersonalRows = holdings.map((h) => [h.id, nowYMCompact, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt]);
  const currentHojinRows = hojinHoldings.map((h) => [h.id, nowYMCompact, h.accountCategory, h.assetClass, OWNER_LABELS.corporate, h.amount, h.updatedAt]);
  const historyPersonalRows = snapshots
    .filter((s) => s.date !== nowYM)
    .flatMap((s) => s.holdings.map((h) => [h.id, toCompactYearMonth(s.date), h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt]));
  const historyHojinRows = hojinSnapshots
    .filter((s) => s.date !== nowYM)
    .flatMap((s) => s.hojinHoldings.map((h) => [h.id, toCompactYearMonth(s.date), h.accountCategory, h.assetClass, OWNER_LABELS.corporate, h.amount, h.updatedAt]));
  const rows = [...currentPersonalRows, ...currentHojinRows, ...historyPersonalRows, ...historyHojinRows];
  const bom = '﻿';
  const csv = bom + [CSV_HEADERS, ...rows].map((r) => r.map(csvField).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${todayStamp()}.csv`);
}

/**
 * id一致→上書き、id不一致→新規追加（既存の位置は保持し、新規分は末尾に追加）。
 * 実体はcsvHistory.tsのmergeById（CSV記録履歴インポートの重複排除と共通のロジック）。
 */
export function mergeHoldings(existing: AssetHolding[], incoming: AssetHolding[]): AssetHolding[] {
  return mergeById(existing, incoming);
}

/** date（'YYYY-MM'）一致→上書き、不一致→新規追加。マージ後はdate昇順に並べ直す。 */
export function mergeSnapshots(existing: AssetSnapshot[], incoming: AssetSnapshot[]): AssetSnapshot[] {
  const merged = [...existing];
  for (const s of incoming) {
    const idx = merged.findIndex((e) => e.date === s.date);
    if (idx >= 0) merged[idx] = s;
    else merged.push(s);
  }
  return merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** mergeSnapshotsの法人スナップショット版（HojinAssetSnapshot[]、dateキーで同じロジック）。 */
function mergeHojinSnapshots(existing: HojinAssetSnapshot[], incoming: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  const merged = [...existing];
  for (const s of incoming) {
    const idx = merged.findIndex((e) => e.date === s.date);
    if (idx >= 0) merged[idx] = s;
    else merged.push(s);
  }
  return merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export interface ImportResult {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  hojinHoldings: AssetHolding[];
  hojinSnapshots: HojinAssetSnapshot[];
  targetAmount: number;
  hojinTargetAmount: number;
  personalizationRatio: number;
}

export interface ParsedJsonImport {
  raw: Record<string, unknown>;
  /** 旧法人形式（scope+hojinHoldingsキーを持つ）か。この形式には設定値・移転ログの概念が無い。 */
  isOldHojinFormat: boolean;
  /** 設定値（目標資産額・個人化想定比率）・移転履歴ログのいずれかを含むか（確認ダイアログの出し分け用）。 */
  includesSettings: boolean;
}

/**
 * JSONファイルをパースするだけで、まだ適用しない（確認ダイアログを挟むための2段階Import、
 * CSVのparseAssetCsv/applyAssetCsvと同じパターン）。設定値・移転履歴ログを含む場合は、
 * 呼び出し側が確認ダイアログで影響範囲を明示できるようincludesSettingsで知らせる
 * （json_export_completeness_and_history_bug.md 2章）。
 */
export function parseJsonPayload(text: string): ParsedJsonImport {
  const raw = JSON.parse(text) as Record<string, unknown>;
  const isOldHojinFormat = 'scope' in raw;
  const includesSettings = !isOldHojinFormat && (
    typeof raw.targetAmount === 'number' ||
    typeof raw.hojinTargetAmount === 'number' ||
    typeof raw.personalizationRatio === 'number' ||
    Array.isArray(raw.transferLog)
  );
  return { raw, isOldHojinFormat, includesSettings };
}

/**
 * parseJsonPayloadの結果を実際に適用する。ファイルの中身（キーの有無）だけで判断する。
 * 新形式（version1の統一payload、holdings/snapshots/hojinHoldings/hojinSnapshots＋設定値・
 * 移転履歴ログを含む）はキーごとに対応ストアへマージする。後方互換で旧2形式も救済する：
 * - 旧個人形式（holdings+snapshotsのみ、scopeキーなし）：新形式のサブセットとして自然に扱える
 * - 旧法人形式（scope+hojinHoldingsキーを持つ）：この形式のsnapshotsキーは
 *   HojinAssetSnapshot[]を指しており、新形式のsnapshots（個人のAssetSnapshot[]）とキー名が
 *   衝突するため、isOldHojinFormatで検出した場合のみ専用分岐で処理する
 *   （snapshots→法人ストアへ、personalHoldings（あれば）→個人の現在値のみへ。設定値・移転
 *   ログはこの形式に存在しないため触れない）。
 * 設定値は上書き（スカラー値なのでマージという概念が無い）、移転履歴ログはid一致でマージする
 * （mergeTransferLog、既存ログを失わない）。
 */
export function applyJsonPayload(parsed: ParsedJsonImport): ImportResult {
  const raw = parsed.raw;
  let holdings = loadHoldings();
  let snapshots = loadSnapshots();
  let hojinHoldings = loadHojinHoldings();
  let hojinSnapshots = loadHojinSnapshots();

  if (parsed.isOldHojinFormat) {
    // 旧法人形式：hojinHoldings必須、snapshotsは法人スナップショット、personalHoldingsは任意。
    if (Array.isArray(raw.hojinHoldings)) {
      hojinHoldings = mergeById(hojinHoldings, raw.hojinHoldings as AssetHolding[]);
      saveHojinHoldings(hojinHoldings);
    }
    if (Array.isArray(raw.snapshots)) {
      hojinSnapshots = mergeHojinSnapshots(hojinSnapshots, raw.snapshots as HojinAssetSnapshot[]);
      saveHojinSnapshots(hojinSnapshots);
    }
    if (Array.isArray(raw.personalHoldings)) {
      holdings = mergeHoldings(holdings, raw.personalHoldings as AssetHolding[]);
      saveHoldings(holdings);
    }
  } else {
    // 新形式・旧個人形式共通：存在するキーだけをそれぞれ対応ストアへマージする。
    if (Array.isArray(raw.holdings)) {
      holdings = mergeHoldings(holdings, raw.holdings as AssetHolding[]);
      saveHoldings(holdings);
    }
    if (Array.isArray(raw.snapshots)) {
      snapshots = mergeSnapshots(snapshots, raw.snapshots as AssetSnapshot[]);
      saveSnapshots(snapshots);
    }
    if (Array.isArray(raw.hojinHoldings)) {
      hojinHoldings = mergeById(hojinHoldings, raw.hojinHoldings as AssetHolding[]);
      saveHojinHoldings(hojinHoldings);
    }
    if (Array.isArray(raw.hojinSnapshots)) {
      hojinSnapshots = mergeHojinSnapshots(hojinSnapshots, raw.hojinSnapshots as HojinAssetSnapshot[]);
      saveHojinSnapshots(hojinSnapshots);
    }
    if (typeof raw.targetAmount === 'number') saveTargetAmount(raw.targetAmount);
    if (typeof raw.hojinTargetAmount === 'number') saveHojinTargetAmount(raw.hojinTargetAmount);
    if (typeof raw.personalizationRatio === 'number') savePersonalizationRatio(raw.personalizationRatio);
    if (Array.isArray(raw.transferLog)) mergeTransferLog(raw.transferLog as TransferLogEntry[]);
  }

  return {
    holdings,
    snapshots,
    hojinHoldings,
    hojinSnapshots,
    targetAmount: loadTargetAmount(),
    hojinTargetAmount: loadHojinTargetAmount(),
    personalizationRatio: loadPersonalizationRatio(),
  };
}

function stripBom(text: string): string {
  return text.replace(/^﻿/, '');
}

function parseHeader(text: string): string[] {
  const firstLine = stripBom(text).split(/\r?\n/)[0] ?? '';
  return parseCsvLine(firstLine);
}

function headerMatches(header: string[], expected: string[]): boolean {
  return header.length === expected.length && header.every((h, i) => h === expected[i]);
}

export type CsvFormat = 'history' | 'legacy' | 'unknown';

/** ファイルの1行目ヘッダーだけを見て、年月列ありの新形式か、旧6列形式かを判定する。 */
export function detectCsvFormat(text: string): CsvFormat {
  const header = parseHeader(text);
  if (headerMatches(header, CSV_HEADERS)) return 'history';
  if (headerMatches(header, LEGACY_CSV_HEADERS)) return 'legacy';
  return 'unknown';
}

/**
 * 自社CSV Exportの列構成と完全一致するCSVのみを読み込む。旧6列・「保有者」ヘッダーの
 * 後方互換パス。年月ラベルを持たないため、全行を現在のholdingsへのidベースマージとしてのみ
 * 扱う（スナップショットには一切触れない、従来通り）。「区分」列の値で個人／法人へ振り分ける
 * （2章の設計方針：CSVの中身だけで判断する、を旧形式にも適用する）。
 */
export function importHoldingsFromCsvText(text: string): ImportResult {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);
  const header = parseCsvLine(lines[0]);
  if (!headerMatches(header, LEGACY_CSV_HEADERS)) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const rows: AssetHolding[] = lines.slice(1).map((line) => {
    const [id, accountCategory, assetClass, ownerLabel, amountStr, updatedAt] = parseCsvLine(line);
    return {
      id,
      owner: OWNER_LABEL_TO_VALUE[ownerLabel] ?? 'personal',
      accountCategory,
      assetClass,
      amount: Number(amountStr) || 0,
      updatedAt,
    };
  });

  const personalRows = rows.filter((r) => r.owner !== 'corporate');
  const hojinRows = rows.filter((r) => r.owner === 'corporate');

  let holdings = loadHoldings();
  let hojinHoldings = loadHojinHoldings();
  if (personalRows.length > 0) {
    holdings = mergeHoldings(holdings, personalRows);
    saveHoldings(holdings);
  }
  if (hojinRows.length > 0) {
    hojinHoldings = mergeById(hojinHoldings, hojinRows);
    saveHojinHoldings(hojinHoldings);
  }

  return {
    holdings,
    snapshots: loadSnapshots(),
    hojinHoldings,
    hojinSnapshots: loadHojinSnapshots(),
    // CSVは設定値を一切扱わないため、現在値をそのまま返す（呼び出し側の型を統一するため）。
    targetAmount: loadTargetAmount(),
    hojinTargetAmount: loadHojinTargetAmount(),
    personalizationRatio: loadPersonalizationRatio(),
  };
}

/** @deprecated 互換のためFile版も残す。内部でimportHoldingsFromCsvTextを呼ぶだけの薄いラッパー。 */
export function importHoldingsFromCsv(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        resolve(importHoldingsFromCsvText(ev.target?.result as string));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(CSV_IMPORT_ERROR_MESSAGE));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export interface ParsedAssetCsv {
  personalGroups: Map<string, AssetHolding[]>;
  hojinGroups: Map<string, AssetHolding[]>;
  personalYearMonths: string[];
  hojinYearMonths: string[];
}

/**
 * 年月列ありの新形式CSVをパースする（適用はまだ行わない。確認ダイアログを挟むための2段階
 * Import）。スコープの概念はない：各行の「区分」列だけを見て、本人/配偶者行はpersonalGroupsへ、
 * 法人行はhojinGroupsへ、常に両方分類する（investigation_csv_duplicate_bug_and_reset_feature.md
 * バグB対応・simplify_csv_scope_and_fix_graph_history_bug.md 2章：CSVの中身だけで判断する）。
 */
export function parseAssetCsv(text: string): ParsedAssetCsv {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);
  const header = parseCsvLine(lines[0]);
  if (!headerMatches(header, CSV_HEADERS)) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const badRows: string[] = [];
  const rows = lines.slice(1).map((line, i) => {
    const [id, rawYearMonth, accountCategory, assetClass, ownerLabel, amountStr, updatedAt] = parseCsvLine(line);
    const yearMonth = normalizeYearMonth(rawYearMonth);
    if (!yearMonth) badRows.push(`${i + 2}行目「${rawYearMonth}」`);
    const holding = rowToHolding({
      id,
      owner: OWNER_LABEL_TO_VALUE[ownerLabel] ?? 'personal',
      accountCategory,
      assetClass,
      amount: Number(amountStr) || 0,
      updatedAt,
    });
    return { ...holding, yearMonth: yearMonth ?? '' };
  });
  // 年月列を解釈できない行が1つでもあれば、インポート全体を中断する（曖昧な形式を
  // 別グループとして受理して分裂させることは絶対にしない）。
  if (badRows.length > 0) {
    throw new Error(`年月列を解釈できない行があります: ${badRows.join('、')}。CSVを修正して再度お試しください。`);
  }

  const { ownGroups: personalGroups, otherGroups: hojinGroups } = splitGroupsByOwners(rows, ['personal', 'personal_spouse']);
  return {
    personalGroups,
    hojinGroups,
    personalYearMonths: sortedYearMonths(personalGroups),
    hojinYearMonths: sortedYearMonths(hojinGroups),
  };
}

/**
 * parseAssetCsvの結果を実際に適用する。personalGroupsが非空なら個人ストアへ、hojinGroupsが
 * 非空なら法人ストアへ、それぞれ独立にapplyGroupsToStoreで適用する（年月ラベルごとの
 * 削除→挿入、今月ラベルが含まれる場合は現在のholdingsも同期）。戻り値は常に両ストアの
 * 最新状態を含む（呼び出し側で「変化があったかどうか」の分岐は不要）。
 */
export function applyAssetCsv(parsed: ParsedAssetCsv): ImportResult & {
  removed: AssetSnapshot[];
  removedHojin: HojinAssetSnapshot[];
} {
  const nowYM = toYearMonth(new Date());

  const personalResult = parsed.personalGroups.size > 0
    ? applyGroupsToStore(parsed.personalGroups, nowYM, personalStoreAdapter)
    : { holdings: loadHoldings(), snapshots: loadSnapshots(), removed: [] as AssetSnapshot[] };

  const hojinResult = parsed.hojinGroups.size > 0
    ? applyGroupsToStore(parsed.hojinGroups, nowYM, hojinStoreAdapter)
    : { holdings: loadHojinHoldings(), snapshots: loadHojinSnapshots(), removed: [] as HojinAssetSnapshot[] };

  return {
    // CSVは設定値を一切扱わないため、現在値をそのまま返す（呼び出し側の型を統一するため）。
    targetAmount: loadTargetAmount(),
    hojinTargetAmount: loadHojinTargetAmount(),
    personalizationRatio: loadPersonalizationRatio(),
    holdings: personalResult.holdings,
    snapshots: personalResult.snapshots,
    removed: personalResult.removed,
    hojinHoldings: hojinResult.holdings,
    hojinSnapshots: hojinResult.snapshots,
    removedHojin: hojinResult.removed,
  };
}
