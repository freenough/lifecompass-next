import type { AssetHolding } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from './types';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots,
  saveSnapshots,
} from './storage';
import { loadHoldings as loadPersonalHoldings, saveHoldings as savePersonalHoldings } from '@/lib/assetManagement/storage';
import { mergeHoldings } from '@/lib/assetManagement/exportImport';
import { HOJIN_ACCOUNT_CATEGORIES } from '@/lib/assetManagement/categories';

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

// フェーズ1：個人版CSVと同じ「区分」列（本人/配偶者/法人）1本で法人行・個人行を判別する。
// 旧来の別立て「区分(法人/個人)」列は廃止（「区分='法人'」で法人行と判別できるため冗長）。
// IDを1列目に含めるのは、CSV Importで自社Export形式のみを対象にidベースのマージを
// そのまま再利用するため（個人側と同じ設計判断）。
const CSV_HEADERS = ['ID', '口座カテゴリ', '資産クラス', '区分', '金額(万円)', '更新日'];
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

export function exportToCsv(
  hojinHoldings: AssetHolding[],
  personalHoldings: AssetHolding[],
  scope: ExportScope,
): void {
  const hojinRows = hojinHoldings.map((h) => [h.id, h.accountCategory, h.assetClass, OWNER_LABELS.corporate, h.amount, h.updatedAt]);
  const personalRows = scope === 'combined'
    ? personalHoldings.map((h) => [h.id, h.accountCategory, h.assetClass, OWNER_LABELS[h.owner] ?? h.owner, h.amount, h.updatedAt])
    : [];
  const rows = [...hojinRows, ...personalRows];
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

/**
 * 自社CSV Exportの列構成と完全一致するCSVのみを読み込む。ヘッダーが一致しない場合は
 * 取り込みを中断する（部分一致・列推測は行わない）。「口座カテゴリ」の値が法人カテゴリ
 * （HOJIN_ACCOUNT_CATEGORIES）に含まれるかどうかで法人／個人の行を振り分ける
 * （フェーズ1：旧来の別立て「区分(法人/個人)」列を廃止したことに伴う判別方法の変更）。
 */
export function importFromCsv(file: File): Promise<{
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
}> {
  const hojinCategorySet = new Set<string>(HOJIN_ACCOUNT_CATEGORIES);
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

        const incomingHojin: AssetHolding[] = [];
        const incomingPersonal: AssetHolding[] = [];

        lines.slice(1).forEach((line) => {
          const [id, accountCategory, assetClass, ownerLabel, amountStr, updatedAt] = parseCsvLine(line);
          const amount = Number(amountStr) || 0;
          const owner = OWNER_LABEL_TO_VALUE[ownerLabel] ?? 'personal';
          const holding: AssetHolding = { id, owner, accountCategory, assetClass, amount, updatedAt };
          if (hojinCategorySet.has(accountCategory)) {
            incomingHojin.push(holding);
          } else {
            incomingPersonal.push(holding);
          }
        });

        const mergedHojinHoldings = mergeById(loadHojinHoldings(), incomingHojin);
        saveHojinHoldings(mergedHojinHoldings);

        let personalHoldings = loadPersonalHoldings();
        if (incomingPersonal.length > 0) {
          personalHoldings = mergeHoldings(personalHoldings, incomingPersonal);
          savePersonalHoldings(personalHoldings);
        }

        resolve({ hojinHoldings: mergedHojinHoldings, personalHoldings });
      } catch (e) {
        reject(e instanceof Error ? e : new Error(CSV_IMPORT_ERROR_MESSAGE));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
