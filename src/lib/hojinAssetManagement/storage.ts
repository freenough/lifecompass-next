import type { AssetHolding } from '@/lib/assetManagement/types';
import { MAX_SNAPSHOTS } from '@/lib/assetManagement/config';
import type { HojinAssetSnapshot } from './types';
import { toYearMonth } from './monthlyCheck';

// 個人資産管理ツール（'lifeCompassAssetHoldings'等）とは完全に分離した法人ツール専用キー。
const HOJIN_HOLDINGS_KEY = 'hojinAssetHoldings';
const SNAPSHOTS_KEY = 'hojinAssetSnapshots';
const TARGET_KEY = 'hojinAssetTarget';
const PERSONALIZATION_RATIO_KEY = 'hojinPersonalizationRatio';
const DEFAULT_PERSONALIZATION_RATIO = 70; // 7章：デフォルト70%を仮置き

// 個人側と共通の上限件数（追加実装でsrc/lib/assetManagement/config.tsに一元化）。
export { MAX_SNAPSHOTS };

export function loadHojinHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOJIN_HOLDINGS_KEY);
    return raw ? (JSON.parse(raw) as AssetHolding[]) : [];
  } catch {
    return [];
  }
}

export function saveHojinHoldings(holdings: AssetHolding[]): void {
  localStorage.setItem(HOJIN_HOLDINGS_KEY, JSON.stringify(holdings));
}

// dateを自然キーとしてsnapshotsを一意化する（後勝ち）。個人側storage.tsと同じ考え方を複製。
function dedupeSnapshotsByDate(snapshots: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  const map = new Map<string, HojinAssetSnapshot>();
  for (const s of snapshots) map.set(s.date, s);
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// フェーズ1でHojinAssetSnapshotにprofileIdを追加したことに伴う後方互換マイグレーション
// （欠落しているデータは'default'で補完する。将来のプロファイル機能の下地、機能自体は未実装）。
function withDefaultProfileId(snapshots: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  return snapshots.map((s) => (s.profileId ? s : { ...s, profileId: 'default' }));
}

export function loadSnapshots(): HojinAssetSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HojinAssetSnapshot[];
    const deduped = dedupeSnapshotsByDate(withDefaultProfileId(parsed));
    if (deduped.length !== parsed.length || deduped.some((s, i) => s.profileId !== parsed[i]?.profileId)) {
      saveSnapshots(deduped);
    }
    return deduped;
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: HojinAssetSnapshot[]): { trimmed: HojinAssetSnapshot[]; removed: HojinAssetSnapshot[] } {
  const excess = snapshots.length - MAX_SNAPSHOTS;
  const removed = excess > 0 ? snapshots.slice(0, excess) : [];
  const trimmed = excess > 0 ? snapshots.slice(excess) : snapshots;
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
  return { trimmed, removed };
}

/**
 * 「記録する」ボタン押下時、法人保有資産・個人資産（統合ページが保持するライブstate）の
 * 両方をまとめて1つのHojinAssetSnapshotとして保存する。personalHoldingsは呼び出し元
 * （統合ページ）がその瞬間の個人holdings stateをそのまま渡す想定で、法人ツール側では
 * 別途永続化・インポートは行わない（フェーズ1：「個人データをインポート」方式を廃止し、
 * 常時ライブ参照＋記録時自動キャプチャに変更）。
 */
export function addSnapshot(
  hojinHoldings: AssetHolding[],
  personalHoldings: AssetHolding[],
): { snapshots: HojinAssetSnapshot[]; removed: HojinAssetSnapshot[] } {
  const snapshot: HojinAssetSnapshot = {
    date: toYearMonth(new Date()),
    hojinHoldings,
    personalHoldings,
    totalHojinAmount: hojinHoldings.reduce((s, h) => s + h.amount, 0),
    totalPersonalAmount: personalHoldings.reduce((s, h) => s + h.amount, 0),
    profileId: 'default',
  };
  const existing = loadSnapshots();
  const idx = existing.findIndex((s) => s.date === snapshot.date);
  const next = idx >= 0 ? existing.map((s, i) => (i === idx ? snapshot : s)) : [...existing, snapshot];
  const { trimmed, removed } = saveSnapshots(next);
  return { snapshots: trimmed, removed };
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
