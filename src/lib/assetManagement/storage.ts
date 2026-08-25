import type { AssetHolding, AssetSnapshot } from './types';
import { toYearMonth } from './monthlyCheck';
import { MAX_SNAPSHOTS } from './config';
import { normalizeYearMonth, mergeById } from './csvHistory';

// 既存の'lifeCompassProfiles'（src/lib/storage.ts）とは完全に分離した新規キー。
const HOLDINGS_KEY  = 'lifeCompassAssetHoldings';
const SNAPSHOTS_KEY = 'lifeCompassAssetSnapshots';
const TARGET_KEY    = 'lifeCompassAssetTarget';

export { MAX_SNAPSHOTS };

/**
 * これまでの一連の修正（CSVインポート時のmergeById重複排除等）が入る前にHOLDINGS_KEYへ
 * 書き込まれてしまった重複データ（同一idが複数件）は、新規の書き込みが起きない限り
 * 永久に残り続ける。loadSnapshotsが持つ自己修復パターン（読み込みのたびに正規化し、
 * 変化があれば保存し直す）と同じ考え方で、読み込みのたびにmergeByIdで重複排除する
 * （fix_loadHoldings_missing_dedup.md）。
 */
export function loadHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssetHolding[];
    const deduped = mergeById([], parsed); // id一致→後勝ちで1件に収束（既存のmergeByIdを再利用）
    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
      saveHoldings(deduped);
    }
    return deduped;
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

/**
 * 差し戻し対応（remand_csv_date_parsing_and_scope_fix.md）でCSV年月列の正規化を実装したが、
 * それ以前に「Aug-26」のような未正規化ラベルで保存されてしまったスナップショットは
 * 新規インポート時のバリデーションだけでは直らない（読み込みのたびに残り続ける）。
 * 読み込みのたびにdate文字列がYYYY-MM形式でないものをnormalizeYearMonthで正規化し、
 * 正規化後のdateに既存のスナップショットがあればholdingsをmergeById（正規化後の年月に
 * 元々あった行を優先し、未正規化側にしかない行は追加で取り込む）で統合する
 * （investigation_csv_duplicate_bug_and_reset_feature.md §3）。
 * normalizeYearMonthがnullを返す場合（万一パターンにも当てはまらない場合）はデータを
 * 失わないよう元のdateのまま残す。
 */
function migrateBadDateLabels(snapshots: AssetSnapshot[]): AssetSnapshot[] {
  const isValid = (date: string) => /^\d{4}-\d{2}$/.test(date);
  const bad = snapshots.filter((s) => !isValid(s.date));
  if (bad.length === 0) return snapshots;

  const byDate = new Map<string, AssetSnapshot>(snapshots.filter((s) => isValid(s.date)).map((s) => [s.date, s]));
  const unmigratable: AssetSnapshot[] = [];
  for (const s of bad) {
    const fixedDate = normalizeYearMonth(s.date);
    if (!fixedDate) {
      unmigratable.push(s);
      continue;
    }
    const existing = byDate.get(fixedDate);
    const holdings = existing ? mergeById(s.holdings, existing.holdings) : s.holdings;
    byDate.set(fixedDate, {
      date: fixedDate,
      holdings,
      totalAmount: holdings.reduce((sum, h) => sum + (h.amount || 0), 0),
      profileId: existing?.profileId || s.profileId || 'default',
    });
  }
  return [...Array.from(byDate.values()), ...unmigratable].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function loadSnapshots(): AssetSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssetSnapshot[];
    const dateFixed = migrateBadDateLabels(parsed);
    const deduped = dedupeSnapshotsByDate(withDefaultProfileId(dateFixed));
    // 4章の不具合（addSnapshotが同一dateでも無条件追加していたため生じた既存の重複行）や、
    // 上記の未正規化年月ラベルを、読み込みのたびに自動整理する。ユーザーの実データを
    // 削除するわけではない（本来あるべき状態に揃えるだけ）。
    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
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

/**
 * csvHistory.tsのapplyGroupsToStoreへ渡す、個人ストア用のアダプタ。personal/hojin両側の
 * exportImport.tsが「自ストア書き込み」「相互ストアへのクロス書き込み（合算スコープ時）」の
 * 計2箇所からこれをそのまま再利用する（csv_yyyymm_format_and_import_scope_fix.md 2章）。
 */
export const personalStoreAdapter = {
  loadHistory: loadSnapshots,
  saveHistory: saveSnapshots,
  toDated: (s: AssetSnapshot) => s.holdings,
  fromDated: (date: string, holdings: AssetHolding[], prev: AssetSnapshot | undefined): AssetSnapshot => ({
    date,
    holdings,
    totalAmount: holdings.reduce((s, h) => s + (h.amount || 0), 0),
    profileId: prev?.profileId || 'default',
  }),
  loadCurrentHoldings: loadHoldings,
  saveCurrentHoldings: saveHoldings,
};

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

/**
 * 個人資産管理ツールの全データを削除する（追加実装4章：全データリセット機能）。
 * 保有資産・記録履歴は常に削除する。目標資産額（設定値）はincludeSettingsがtrueのときのみ削除。
 * 取り消せない操作であり、呼び出し元（UI）で確認ダイアログを表示してから呼ぶこと。
 */
export function resetAll(options: { includeSettings: boolean }): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HOLDINGS_KEY);
  localStorage.removeItem(SNAPSHOTS_KEY);
  if (options.includeSettings) {
    localStorage.removeItem(TARGET_KEY);
  }
}
