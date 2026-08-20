import type { HojinAssetHolding, HojinCopiedPersonalHolding, HojinAssetSnapshot } from './types';
import { toYearMonth } from './monthlyCheck';

// 個人資産管理ツール（'lifeCompassAssetHoldings'等）とは完全に分離した法人ツール専用キー。
const HOJIN_HOLDINGS_KEY = 'hojinAssetHoldings';
const PERSONAL_HOLDINGS_KEY = 'hojinCopiedPersonalHoldings';
const PERSONAL_LAST_UPDATED_KEY = 'hojinPersonalLastUpdatedAt';
const SNAPSHOTS_KEY = 'hojinAssetSnapshots';
const TARGET_KEY = 'hojinAssetTarget';
const PERSONALIZATION_RATIO_KEY = 'hojinPersonalizationRatio';
const DEFAULT_PERSONALIZATION_RATIO = 70; // 7章：デフォルト70%を仮置き

// 個人資産管理ツール本体のholdings保存キー（src/lib/assetManagement/storage.ts、ロック対象）。
// 「個人データをインポート」機能専用の読み取り専用参照のため、キー名の文字列だけを複製する
// （個人ツール側のコードはimportしない、5章）。
const PERSONAL_TOOL_HOLDINGS_KEY = 'lifeCompassAssetHoldings';

// 個人側と同じ上限件数（0.2の調査結果：24件＝2年分）。
export const MAX_SNAPSHOTS = 24;

export function loadHojinHoldings(): HojinAssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOJIN_HOLDINGS_KEY);
    return raw ? (JSON.parse(raw) as HojinAssetHolding[]) : [];
  } catch {
    return [];
  }
}

export function saveHojinHoldings(holdings: HojinAssetHolding[]): void {
  localStorage.setItem(HOJIN_HOLDINGS_KEY, JSON.stringify(holdings));
}

export function loadPersonalHoldings(): HojinCopiedPersonalHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PERSONAL_HOLDINGS_KEY);
    return raw ? (JSON.parse(raw) as HojinCopiedPersonalHolding[]) : [];
  } catch {
    return [];
  }
}

export function savePersonalHoldings(holdings: HojinCopiedPersonalHolding[], updatedAt: string): void {
  localStorage.setItem(PERSONAL_HOLDINGS_KEY, JSON.stringify(holdings));
  localStorage.setItem(PERSONAL_LAST_UPDATED_KEY, updatedAt);
}

export function loadPersonalLastUpdatedAt(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PERSONAL_LAST_UPDATED_KEY) ?? '';
}

/**
 * 個人資産管理ツール本体（/asset-simulator/assets）のlocalStorageを直接読み取り、
 * このツールの個人資産パネル形式に変換する（5章：「個人データをインポート」機能）。
 * owner: 'corporate'（個人側で将来のHitori-Hojin連携用に予約されている値、Phase1のUIでは
 * 選択不可）が万一含まれていた場合はフィルタで除外する（このパネルはcorporateを扱わないため）。
 * 個人ツール本体への書き戻しは一切行わない読み取り専用の参照。
 */
export function readPersonalToolHoldingsForImport(): HojinCopiedPersonalHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PERSONAL_TOOL_HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      owner: string;
      accountCategory: string;
      assetClass: string;
      amount: number;
      updatedAt: string;
    }>;
    return parsed
      .filter((h) => h.owner === 'personal' || h.owner === 'personal_spouse')
      .map((h) => ({
        id: h.id,
        owner: h.owner as 'personal' | 'personal_spouse',
        accountCategory: h.accountCategory,
        assetClass: h.assetClass,
        amount: h.amount,
        updatedAt: h.updatedAt,
      }));
  } catch {
    return [];
  }
}

// dateを自然キーとしてsnapshotsを一意化する（後勝ち）。個人側storage.tsと同じ考え方を複製。
function dedupeSnapshotsByDate(snapshots: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  const map = new Map<string, HojinAssetSnapshot>();
  for (const s of snapshots) map.set(s.date, s);
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function loadSnapshots(): HojinAssetSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HojinAssetSnapshot[];
    const deduped = dedupeSnapshotsByDate(parsed);
    if (deduped.length !== parsed.length) saveSnapshots(deduped);
    return deduped;
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: HojinAssetSnapshot[]): void {
  const trimmed = snapshots.length > MAX_SNAPSHOTS
    ? snapshots.slice(snapshots.length - MAX_SNAPSHOTS)
    : snapshots;
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
}

/**
 * 「記録する」ボタン押下時、法人保有資産・個人資産パネルの両方をまとめて1つの
 * HojinAssetSnapshotとして保存する（6.1節）。同月内に複数回押された場合はdateが
 * 一致するため上書きする（個人側で修正済みの重複バグと同じ設計を最初から適用）。
 */
export function addSnapshot(
  hojinHoldings: HojinAssetHolding[],
  personalHoldings: HojinCopiedPersonalHolding[],
  personalLastUpdatedAt: string,
): HojinAssetSnapshot[] {
  const snapshot: HojinAssetSnapshot = {
    date: toYearMonth(new Date()),
    hojinHoldings,
    personalHoldings,
    personalLastUpdatedAt,
    totalHojinAmount: hojinHoldings.reduce((s, h) => s + h.amount, 0),
    totalPersonalAmount: personalHoldings.reduce((s, h) => s + h.amount, 0),
  };
  const existing = loadSnapshots();
  const idx = existing.findIndex((s) => s.date === snapshot.date);
  const next = idx >= 0 ? existing.map((s, i) => (i === idx ? snapshot : s)) : [...existing, snapshot];
  saveSnapshots(next);
  return next;
}

export function loadTargetAmount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(TARGET_KEY);
    const n = raw ? Number(raw) : 0;
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

export function saveTargetAmount(amount: number): void {
  localStorage.setItem(TARGET_KEY, String(amount));
}

export function loadPersonalizationRatio(): number {
  if (typeof window === 'undefined') return DEFAULT_PERSONALIZATION_RATIO;
  try {
    const raw = localStorage.getItem(PERSONALIZATION_RATIO_KEY);
    if (raw === null) return DEFAULT_PERSONALIZATION_RATIO;
    const n = Number(raw);
    return isNaN(n) ? DEFAULT_PERSONALIZATION_RATIO : n;
  } catch {
    return DEFAULT_PERSONALIZATION_RATIO;
  }
}

export function savePersonalizationRatio(ratio: number): void {
  localStorage.setItem(PERSONALIZATION_RATIO_KEY, String(ratio));
}
