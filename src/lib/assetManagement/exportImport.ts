import type { AssetHolding, AssetSnapshot } from './types';
import { loadHoldings, saveHoldings, loadSnapshots, saveSnapshots } from './storage';
import { toYearMonth } from './monthlyCheck';
import { groupRowsByYearMonth, replaceYearMonthGroups, sortedYearMonths, rowToHolding } from './csvHistory';

interface AssetManagementExportPayload {
  version: 1;
  exportedAt: string;
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
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

// ダウンロードファイル名は内部の開発コードネーム「lifecompass」を含めない（1章：
// ブランド漏洩の修正）。既存の資産シミュレーター本体のCSVエクスポート
// （YearlyTable.tsx: `asset_simulation_${date}.csv`）と同じ命名規則
// （英語スネークケース・日付サフィックス、ブランド名を含めない）に揃える。
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

export function exportToJson(holdings: AssetHolding[], snapshots: AssetSnapshot[]): void {
  const payload: AssetManagementExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    holdings,
    snapshots,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${todayStamp()}.json`);
}

// CSVはこの並びで固定。IDを1列目に含めるのは、CSV Importで自社Export形式のみを
// 対象にidベースのmergeHoldings（JSON Importと共通ロジック）をそのまま再利用するため
// （2章：IDが無いと「同じCSVを2回取り込むと行が倍増する」という別の重複バグを生む）。
// フェーズ1（資産管理ツール統合）で法人版CSVと列構成を揃えるため、3列目のラベルを
// 「保有者」→「区分」に改称した（値の意味・集合は不変：本人/配偶者/法人）。
// 追加実装（CSV記録履歴対応）で7列目に「年月」を追加し、現在値だけでなく過去の記録履歴
// （AssetSnapshot[]）もCSVでまとめて編集できるようにした。
const CSV_HEADERS = ['ID', '口座カテゴリ', '資産クラス', '区分', '金額(万円)', '更新日', '年月'];
// 「年月」列を追加する前（保存上限変更前）のCSVも後方互換で読み込めるようにする。
// 6列CSVは年月ラベルを持たないため、全行を「今月扱い」として現在のholdingsのみへ
// インポートする（従来のimportHoldingsFromCsvと同じ挙動、スナップショットには触れない）。
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
 * 現在の保有資産（今月ラベル）＋保存済みの全記録履歴（今月分と重複する場合は現在値を優先し
 * 履歴側は除外）を年月ラベル付きでCSV出力する（追加実装：CSV記録履歴対応）。
 */
export function exportToCsv(holdings: AssetHolding[], snapshots: AssetSnapshot[]): void {
  const nowYM = toYearMonth(new Date());
  const currentRows = holdings.map((h) => [h.id, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt, nowYM]);
  const historyRows = snapshots
    .filter((s) => s.date !== nowYM)
    .flatMap((s) => s.holdings.map((h) => [h.id, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt, s.date]));
  const rows = [...currentRows, ...historyRows];
  const bom = '﻿';
  const csv = bom + [CSV_HEADERS, ...rows].map((r) => r.map(csvField).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${todayStamp()}.csv`);
}

/** id一致→上書き、id不一致→新規追加（既存の位置は保持し、新規分は末尾に追加）。 */
export function mergeHoldings(existing: AssetHolding[], incoming: AssetHolding[]): AssetHolding[] {
  const merged = [...existing];
  for (const h of incoming) {
    const idx = merged.findIndex(e => e.id === h.id);
    if (idx >= 0) merged[idx] = h;
    else merged.push(h);
  }
  return merged;
}

/**
 * date（'YYYY-MM'）を自然キーとしてid相当に使う（AssetSnapshotに固有id・name
 * フィールドが無いため、既存importProfilesパターンの「id一致→上書き」をdateに読み替え）。
 * date一致→上書き、不一致→新規追加。マージ後はdate昇順に並べ直す。
 */
export function mergeSnapshots(existing: AssetSnapshot[], incoming: AssetSnapshot[]): AssetSnapshot[] {
  const merged = [...existing];
  for (const s of incoming) {
    const idx = merged.findIndex(e => e.date === s.date);
    if (idx >= 0) merged[idx] = s;
    else merged.push(s);
  }
  return merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function importFromJson(file: File): Promise<{ holdings: AssetHolding[]; snapshots: AssetSnapshot[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<AssetManagementExportPayload>;
        const mergedHoldings = mergeHoldings(loadHoldings(), parsed.holdings ?? []);
        const mergedSnapshots = mergeSnapshots(loadSnapshots(), parsed.snapshots ?? []);
        saveHoldings(mergedHoldings);
        saveSnapshots(mergedSnapshots);
        resolve({ holdings: mergedHoldings, snapshots: mergedSnapshots });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
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
 * 自社CSV Exportの列構成と完全一致するCSVのみを読み込む（2章：段階Aのスコープ）。
 * 6列・旧「保有者」ヘッダーの後方互換パス。年月ラベルを持たないため、全行を現在の
 * holdingsへのidベースマージとしてのみ扱う（スナップショットには一切触れない、従来通り）。
 */
export function importHoldingsFromCsvText(text: string): AssetHolding[] {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);
  const header = parseCsvLine(lines[0]);
  if (!headerMatches(header, LEGACY_CSV_HEADERS)) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const incoming: AssetHolding[] = lines.slice(1).map((line) => {
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

  const mergedHoldings = mergeHoldings(loadHoldings(), incoming);
  saveHoldings(mergedHoldings);
  return mergedHoldings;
}

/** @deprecated 互換のためFile版も残す。内部でimportHoldingsFromCsvTextを呼ぶだけの薄いラッパー。 */
export function importHoldingsFromCsv(file: File): Promise<AssetHolding[]> {
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

export interface ParsedHistoryCsv {
  groups: Map<string, AssetHolding[]>;
  affectedYearMonths: string[];
}

/**
 * 年月列ありの新形式CSVをパースする（適用はまだ行わない。確認ダイアログを挟むための
 * 2段階Import、追加実装：CSV記録履歴対応 1-3節）。
 */
export function parseHistoryCsv(text: string): ParsedHistoryCsv {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);
  const header = parseCsvLine(lines[0]);
  if (!headerMatches(header, CSV_HEADERS)) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const rows = lines.slice(1).map((line) => {
    const [id, accountCategory, assetClass, ownerLabel, amountStr, updatedAt, yearMonth] = parseCsvLine(line);
    const holding = rowToHolding({
      id,
      owner: OWNER_LABEL_TO_VALUE[ownerLabel] ?? 'personal',
      accountCategory,
      assetClass,
      amount: Number(amountStr) || 0,
      updatedAt,
    });
    return { ...holding, yearMonth };
  });

  const groups = groupRowsByYearMonth(rows);
  return { groups, affectedYearMonths: sortedYearMonths(groups) };
}

/**
 * parseHistoryCsvの結果を実際に適用する。年月ラベルごとにグループ化された行で、
 * 既存の同一年月の記録を完全に置き換える（削除→挿入）。今月ラベルが含まれる場合は
 * 現在のholdingsと今月のAssetSnapshotの両方を同期させる（1-3節）。
 */
export function applyHistoryCsv(parsed: ParsedHistoryCsv): {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  removed: AssetSnapshot[];
} {
  const nowYM = toYearMonth(new Date());
  const existingSnapshots = loadSnapshots();
  const existingDated = existingSnapshots.map((s) => ({ date: s.date, holdings: s.holdings }));
  const updatedDated = replaceYearMonthGroups(existingDated, parsed.groups);

  const updatedSnapshots: AssetSnapshot[] = updatedDated.map((d) => ({
    date: d.date,
    holdings: d.holdings,
    totalAmount: d.holdings.reduce((s, h) => s + (h.amount || 0), 0),
    profileId: 'default',
  }));

  const { trimmed, removed } = saveSnapshots(updatedSnapshots);

  const currentGroupRows = parsed.groups.get(nowYM);
  const holdings = currentGroupRows ? currentGroupRows : loadHoldings();
  if (currentGroupRows) saveHoldings(holdings);

  return { holdings, snapshots: trimmed, removed };
}
