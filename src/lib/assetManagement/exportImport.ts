import type { AssetHolding, AssetSnapshot } from './types';
import { loadHoldings, saveHoldings, loadSnapshots, saveSnapshots } from './storage';

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
const CSV_HEADERS = ['ID', '口座カテゴリ', '資産クラス', '保有者', '金額(万円)', '更新日'];
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

export function exportToCsv(holdings: AssetHolding[]): void {
  const rows = holdings.map((h) => [
    h.id,
    h.accountCategory,
    h.assetClass,
    OWNER_LABELS[h.owner] ?? h.owner,
    h.amount,
    h.updatedAt,
  ]);
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

/**
 * 自社CSV Exportの列構成と完全一致するCSVのみを読み込む（2章：段階Aのスコープ）。
 * ヘッダーが一致しない場合は取り込みを中断し、エラーを投げる（部分一致・列推測は行わない）。
 * パース後はJSON Importと同じmergeHoldings（idベース）をそのまま再利用する。
 */
export function importHoldingsFromCsv(file: File): Promise<AssetHolding[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = (ev.target?.result as string).replace(/^﻿/, '');
        const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
        if (lines.length === 0) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

        const header = parseCsvLine(lines[0]);
        const headerMatches =
          header.length === CSV_HEADERS.length && header.every((h, i) => h === CSV_HEADERS[i]);
        if (!headerMatches) throw new Error(CSV_IMPORT_ERROR_MESSAGE);

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
        resolve(mergedHoldings);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(CSV_IMPORT_ERROR_MESSAGE));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
