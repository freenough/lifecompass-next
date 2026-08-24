import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from './types';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots,
  saveSnapshots,
} from './storage';
import {
  loadHoldings as loadPersonalHoldings,
  saveHoldings as savePersonalHoldings,
} from '@/lib/assetManagement/storage';
import { mergeHoldings } from '@/lib/assetManagement/exportImport';
import { toYearMonth } from '@/lib/assetManagement/monthlyCheck';
import { groupRowsByYearMonth, replaceYearMonthGroups, rowToHolding, normalizeYearMonth } from '@/lib/assetManagement/csvHistory';

// 個人資産管理ツール（exportImport.ts、ロック対象外）のExport/Import機構とは別実装だが、
// フェーズ1でCSVヘッダー構成を統一した（4章）。ファイル名は個人側と同じ命名規則
// （英語スネークケース・日付サフィックス・ブランド名を含めない）に揃える。

export type ExportScope = 'hojin' | 'combined';

interface HojinExportPayload {
  version: 1;
  exportedAt: string;
  scope: ExportScope;
  hojinHoldings: AssetHolding[];
  personalHoldings?: AssetHolding[]; // scope==='combined'のときのみ含む
  snapshots: HojinAssetSnapshot[];
}

const FILENAME_PREFIX = 'hitori_hojin_assets';

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

export function exportToJson(
  hojinHoldings: AssetHolding[],
  personalHoldings: AssetHolding[],
  snapshots: HojinAssetSnapshot[],
  scope: ExportScope,
): void {
  const payload: HojinExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope,
    hojinHoldings,
    ...(scope === 'combined' ? { personalHoldings } : {}),
    snapshots,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${scope}_${todayStamp()}.json`);
}

// 個人版CSVと同じ「区分」列（本人/配偶者/法人）1本で法人行・個人行を判別する。
// 追加実装（CSV記録履歴対応）で「年月」列を追加し、現在値だけでなく過去の記録履歴
// （HojinAssetSnapshot[]）もCSVでまとめて編集できるようにした。差し戻し対応（remand
// _csv_date_parsing_and_scope_fix.md 3-3節）で年月列をID列の直後（2列目）に移動した。
// IDを1列目に含めるのは、CSV Importで自社Export形式のみを対象にidベースのマージを
// そのまま再利用するため（個人側と同じ設計判断）。
const CSV_HEADERS = ['ID', '年月', '口座カテゴリ', '資産クラス', '区分', '金額(万円)', '更新日'];
const CSV_IMPORT_ERROR_MESSAGE = '対応していないCSV形式です。自社のCSVエクスポート機能で出力したファイルを選択してください。';

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
export function exportToCsv(
  hojinHoldings: AssetHolding[],
  personalHoldings: AssetHolding[],
  snapshots: HojinAssetSnapshot[],
  scope: ExportScope,
): void {
  const nowYM = toYearMonth(new Date());
  const currentHojinRows = hojinHoldings.map((h) => [h.id, nowYM, h.accountCategory, h.assetClass, OWNER_LABELS.corporate, h.amount, h.updatedAt]);
  const currentPersonalRows = scope === 'combined'
    ? personalHoldings.map((h) => [h.id, nowYM, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt])
    : [];
  const historySnapshots = snapshots.filter((s) => s.date !== nowYM);
  const historyHojinRows = historySnapshots.flatMap((s) =>
    s.hojinHoldings.map((h) => [h.id, s.date, h.accountCategory, h.assetClass, OWNER_LABELS.corporate, h.amount, h.updatedAt])
  );
  const historyPersonalRows = scope === 'combined'
    ? historySnapshots.flatMap((s) =>
        s.personalHoldings.map((h) => [h.id, s.date, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt])
      )
    : [];
  const rows = [...currentHojinRows, ...currentPersonalRows, ...historyHojinRows, ...historyPersonalRows];
  const bom = '﻿';
  const csv = bom + [CSV_HEADERS, ...rows].map((r) => r.map(csvField).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${FILENAME_PREFIX}_${scope}_${todayStamp()}.csv`);
}

/** id一致→上書き、id不一致→新規追加（既存の位置は保持し、新規分は末尾に追加）。 */
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const merged = [...existing];
  for (const item of incoming) {
    const idx = merged.findIndex((e) => e.id === item.id);
    if (idx >= 0) merged[idx] = item;
    else merged.push(item);
  }
  return merged;
}

/** date一致→上書き、不一致→新規追加。マージ後はdate昇順に並べ直す。 */
function mergeSnapshots(existing: HojinAssetSnapshot[], incoming: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  const merged = [...existing];
  for (const s of incoming) {
    const idx = merged.findIndex((e) => e.date === s.date);
    if (idx >= 0) merged[idx] = s;
    else merged.push(s);
  }
  return merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * JSON Importはファイルの内容に基づいて自動判定する（トグルは持たない）。personalHoldings
 * キーが含まれていれば個人資産管理ツール本体のストレージ（唯一の個人保有資産ストア、
 * フェーズ1で型統一）へidベースでマージし、hojinHoldingsは常に法人保有資産へマージする。
 */
export function importFromJson(file: File): Promise<{
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  snapshots: HojinAssetSnapshot[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Partial<HojinExportPayload>;
        const mergedHojinHoldings = mergeById(loadHojinHoldings(), parsed.hojinHoldings ?? []);
        const mergedSnapshots = mergeSnapshots(loadSnapshots(), parsed.snapshots ?? []);
        saveHojinHoldings(mergedHojinHoldings);
        saveSnapshots(mergedSnapshots);
        let personalHoldings = loadPersonalHoldings();
        if (parsed.personalHoldings) {
          personalHoldings = mergeHoldings(personalHoldings, parsed.personalHoldings);
          savePersonalHoldings(personalHoldings);
        }
        resolve({ hojinHoldings: mergedHojinHoldings, personalHoldings, snapshots: mergedSnapshots });
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

export interface ParsedHojinHistoryCsv {
  hojinGroups: Map<string, AssetHolding[]>;
  /** 本人/配偶者行が含まれていた件数（法人インポートでは反映しない。確認ダイアログでの注意喚起用）。 */
  ignoredPersonalRowCount: number;
  affectedYearMonths: string[];
}

/**
 * 自社CSV Exportの列構成と完全一致するCSVのみを読み込む。ヘッダーが一致しない場合は
 * 例外を投げる（部分一致・列推測は行わない）。差し戻し対応（remand_csv_date_parsing_and
 * _scope_fix.md 2章）：法人セクションでのCSVインポートは法人保有資産（owner:'corporate'の行）
 * のみを対象とする。本人/配偶者行が含まれていても個人ツール本体のストアには一切書き込まず、
 * 件数だけ数えて呼び出し元の確認ダイアログでの注意喚起に使う（合算表示のためのライブ参照は
 * 読み取り専用であり、法人側の操作が個人の実データを書き換えてよい設計にはなっていないため）。
 */
export function parseHojinHistoryCsv(text: string): ParsedHojinHistoryCsv {
  const lines = stripBom(text).split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const header = parseCsvLine(lines[0]);
  const headerMatches = header.length === CSV_HEADERS.length && header.every((h, i) => h === CSV_HEADERS[i]);
  if (!headerMatches) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

  const badRows: string[] = [];
  const allRows = lines.slice(1).map((line, i) => {
    const [id, rawYearMonth, accountCategory, assetClass, ownerLabel, amountStr, updatedAt] = parseCsvLine(line);
    const yearMonth = normalizeYearMonth(rawYearMonth);
    if (!yearMonth) badRows.push(`${i + 2}行目「${rawYearMonth}」`);
    const owner = OWNER_LABEL_TO_VALUE[ownerLabel] ?? 'personal';
    const holding = rowToHolding({ id, owner, accountCategory, assetClass, amount: Number(amountStr) || 0, updatedAt });
    return { ...holding, yearMonth: yearMonth ?? '' };
  });
  if (badRows.length > 0) {
    throw new Error(`年月列を解釈できない行があります: ${badRows.join('、')}。CSVを修正して再度お試しください。`);
  }

  const hojinRows = allRows.filter((r) => r.owner === 'corporate');
  const ignoredPersonalRowCount = allRows.length - hojinRows.length;
  const hojinGroups = groupRowsByYearMonth(hojinRows);
  const affectedYearMonths = sortedYearMonthsOf(hojinGroups);

  return { hojinGroups, ignoredPersonalRowCount, affectedYearMonths };
}

function sortedYearMonthsOf(groups: Map<string, AssetHolding[]>): string[] {
  return Array.from(groups.keys()).sort();
}

/**
 * parseHojinHistoryCsvの結果を適用する。法人保有資産（hojinHoldings/hojinSnapshots）のみを
 * 更新し、個人ツール本体のストアには一切触れない。既存の法人スナップショットのpersonalHoldings
 * フィールド（表示用の複製、「記録する」押下時のみ自動キャプチャされる）は変更せずそのまま保持する。
 */
export function applyHojinHistoryCsv(parsed: ParsedHojinHistoryCsv): {
  hojinHoldings: AssetHolding[];
  hojinSnapshots: HojinAssetSnapshot[];
  removedHojin: HojinAssetSnapshot[];
} {
  const nowYM = toYearMonth(new Date());
  let hojinHoldings = loadHojinHoldings();
  const existingHojinSnapshots = loadSnapshots();
  let hojinSnapshots = existingHojinSnapshots;
  let removedHojin: HojinAssetSnapshot[] = [];

  if (parsed.hojinGroups.size > 0) {
    const existingByDate = new Map(existingHojinSnapshots.map((s) => [s.date, s]));
    const existingDated = existingHojinSnapshots.map((s) => ({ date: s.date, holdings: s.hojinHoldings }));
    const updatedDated = replaceYearMonthGroups(existingDated, parsed.hojinGroups);

    const updated: HojinAssetSnapshot[] = updatedDated.map((d) => {
      const prevPersonal = existingByDate.get(d.date)?.personalHoldings ?? [];
      return {
        date: d.date,
        hojinHoldings: d.holdings,
        personalHoldings: prevPersonal,
        totalHojinAmount: d.holdings.reduce((s, h) => s + (h.amount || 0), 0),
        totalPersonalAmount: prevPersonal.reduce((s, h) => s + (h.amount || 0), 0),
        profileId: 'default',
      };
    });
    const { trimmed, removed } = saveSnapshots(updated);
    hojinSnapshots = trimmed;
    removedHojin = removed;
    const currentGroupRows = parsed.hojinGroups.get(nowYM);
    if (currentGroupRows) {
      hojinHoldings = currentGroupRows;
      saveHojinHoldings(hojinHoldings);
    }
  }

  return { hojinHoldings, hojinSnapshots, removedHojin };
}
