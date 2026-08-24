import type { AssetHolding, AssetSnapshot } from './types';
import { toYearMonth } from './monthlyCheck';
import { MAX_SNAPSHOTS } from './config';

// 既存の'lifeCompassProfiles'（src/lib/storage.ts）とは完全に分離した新規キー。
const HOLDINGS_KEY  = 'lifeCompassAssetHoldings';
const SNAPSHOTS_KEY = 'lifeCompassAssetSnapshots';
const TARGET_KEY    = 'lifeCompassAssetTarget';

export { MAX_SNAPSHOTS };

export function loadHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    return raw ? (JSON.parse(raw) as AssetHolding[]) : [];
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: AssetHolding[]): void {
  localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings));
}

// dateを自然キーとしてsnapshotsを一意化する（後勝ち＝同じdateは最後の値を残す）。
// mergeSnapshots（exportImport.ts）と同じ「date一致→上書き」の考え方をここでも使う
// （storage.tsからexportImport.tsを逆importすると循環参照になるため、この3行は複製している）。
function dedupeSnapshotsByDate(snapshots: AssetSnapshot[]): AssetSnapshot[] {
  const map = new Map<string, AssetSnapshot>();
  for (const s of snapshots) map.set(s.date, s);
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// フェーズ1でAssetSnapshotにprofileIdを追加したことに伴う後方互換マイグレーション
// （欠落しているデータは'default'で補完する。将来のプロファイル機能の下地、機能自体は未実装）。
function withDefaultProfileId(snapshots: AssetSnapshot[]): AssetSnapshot[] {
  return snapshots.map((s) => (s.profileId ? s : { ...s, profileId: 'default' }));
}

export function loadSnapshots(): AssetSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssetSnapshot[];
    const deduped = dedupeSnapshotsByDate(withDefaultProfileId(parsed));
    // 4章の不具合（addSnapshotが同一dateでも無条件追加していたため生じた既存の重複行）を、
    // 読み込みのたびに自動整理する。同一dateは最後の値を残すだけで、ユーザーの実データを
    // 削除するわけではない（本来上書きされているべきだった状態に揃えるだけ）。
    if (deduped.length !== parsed.length || deduped.some((s, i) => s.profileId !== parsed[i]?.profileId)) {
      saveSnapshots(deduped);
    }
    return deduped;
  } catch {
    return [];
  }
}

/**
 * 保存上限（MAX_SNAPSHOTS）を超えた分は古い方から削除する。追加実装（保存上限変更）で、
 * 削除されたスナップショットをUI側の通知バナーに使えるよう戻り値で返すようにした。
 */
export function saveSnapshots(snapshots: AssetSnapshot[]): { trimmed: AssetSnapshot[]; removed: AssetSnapshot[] } {
  const excess = snapshots.length - MAX_SNAPSHOTS;
  const removed = excess > 0 ? snapshots.slice(0, excess) : [];
  const trimmed = excess > 0 ? snapshots.slice(excess) : snapshots;
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(trimmed));
  return { trimmed, removed };
}

/**
 * ユーザーが能動的に「記録する」を押したときだけ呼ぶ（自動保存・定期保存は行わない）。
 * 同月内に複数回押された場合はdateが一致するため上書きする（4章バグ修正：以前は
 * 無条件にpushしていたため、同じ月に複数回押すと重複行が生まれていた）。
 */
export function addSnapshot(holdings: AssetHolding[]): { snapshots: AssetSnapshot[]; removed: AssetSnapshot[] } {
  const snapshot: AssetSnapshot = {
    date: toYearMonth(new Date()),
    holdings,
    totalAmount: holdings.reduce((s, h) => s + h.amount, 0),
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
