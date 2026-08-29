import type { AssetHolding } from '@/lib/assetManagement/types';
import { MAX_SNAPSHOTS } from '../assetManagement/config';
import { normalizeYearMonth, mergeById } from '../assetManagement/csvHistory';
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

// フェーズ1でAssetHoldingにprofileIdを追加したことに伴う後方互換マイグレーション（個人側
// storage.tsのwithDefaultHoldingProfileIdと対称。instruction_assetholding_profileid.md）。
// exportImport.tsのJSON Import（raw.hojinHoldingsを直接cast・保存する経路）はloadHojinHoldings()の
// 自己修復を経由しないため、そちらからも呼べるようexportする。
export function withDefaultHoldingProfileId(holdings: AssetHolding[]): AssetHolding[] {
  return holdings.map((h) => (h.profileId ? h : { ...h, profileId: 'default' }));
}

/**
 * 個人版storage.tsのloadHoldingsと同一の構造上の欠陥（fix_loadHoldings_missing_dedup.md）：
 * loadSnapshotsは読み込みのたびに自己修復するが、loadHojinHoldingsにはそれが無く、
 * mergeById導入前に書き込まれた重複データが永久に残り続けていた。同じ自己修復パターンを適用する。
 * profileId欠損の後方互換補完も同時に行う。
 */
export function loadHojinHoldings(): AssetHolding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOJIN_HOLDINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AssetHolding[];
    const deduped = mergeById([], withDefaultHoldingProfileId(parsed));
    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
      saveHojinHoldings(deduped);
    }
    return deduped;
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

/**
 * 未正規化の年月ラベル（例：「Aug-26」）で保存されてしまったスナップショットを、読み込みの
 * たびに正規化・統合する（investigation_csv_duplicate_bug_and_reset_feature.md §3）。
 * 正規化後のdateに既存のスナップショットがあれば、hojinHoldings・personalHoldingsとも
 * mergeById（正規化後の年月に元々あった行を優先、未正規化側にしかない行は追加で取り込む）で
 * 統合する。normalizeYearMonthがnullを返す場合はデータを失わないよう元のdateのまま残す。
 */
function migrateBadDateLabels(snapshots: HojinAssetSnapshot[]): HojinAssetSnapshot[] {
  const isValid = (date: string) => /^\d{4}-\d{2}$/.test(date);
  const bad = snapshots.filter((s) => !isValid(s.date));
  if (bad.length === 0) return snapshots;

  const byDate = new Map<string, HojinAssetSnapshot>(snapshots.filter((s) => isValid(s.date)).map((s) => [s.date, s]));
  const unmigratable: HojinAssetSnapshot[] = [];
  for (const s of bad) {
    const fixedDate = normalizeYearMonth(s.date);
    if (!fixedDate) {
      unmigratable.push(s);
      continue;
    }
    const existing = byDate.get(fixedDate);
    const hojinHoldings = existing ? mergeById(s.hojinHoldings, existing.hojinHoldings) : s.hojinHoldings;
    const personalHoldings = existing ? mergeById(s.personalHoldings, existing.personalHoldings) : s.personalHoldings;
    byDate.set(fixedDate, {
      date: fixedDate,
      hojinHoldings,
      personalHoldings,
      totalHojinAmount: hojinHoldings.reduce((sum, h) => sum + (h.amount || 0), 0),
      totalPersonalAmount: personalHoldings.reduce((sum, h) => sum + (h.amount || 0), 0),
      profileId: existing?.profileId || s.profileId || 'default',
    });
  }
  return [...Array.from(byDate.values()), ...unmigratable].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function loadSnapshots(): HojinAssetSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HojinAssetSnapshot[];
    const dateFixed = migrateBadDateLabels(parsed);
    const deduped = dedupeSnapshotsByDate(withDefaultProfileId(dateFixed));
    if (JSON.stringify(deduped) !== JSON.stringify(parsed)) {
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

/**
 * csvHistory.tsのapplyGroupsToStoreへ渡す、法人ストア用のアダプタ。personal側storage.tsの
 * personalStoreAdapterと対称（csv_yyyymm_format_and_import_scope_fix.md 2章）。fromDatedは
 * personalHoldings/totalPersonalAmount（「記録する」押下時のみ自動キャプチャされる表示用の
 * 複製）をprevスナップショットからそのまま引き継ぐ、既存のapplyHojinHistoryCsvと同じロジック。
 */
export const hojinStoreAdapter = {
  loadHistory: loadSnapshots,
  saveHistory: saveSnapshots,
  toDated: (s: HojinAssetSnapshot) => s.hojinHoldings,
  fromDated: (date: string, holdings: AssetHolding[], prev: HojinAssetSnapshot | undefined): HojinAssetSnapshot => {
    const personalHoldings = prev?.personalHoldings ?? [];
    return {
      date,
      hojinHoldings: holdings,
      personalHoldings,
      totalHojinAmount: holdings.reduce((s, h) => s + (h.amount || 0), 0),
      totalPersonalAmount: personalHoldings.reduce((s, h) => s + (h.amount || 0), 0),
      profileId: prev?.profileId || 'default',
    };
  },
  loadCurrentHoldings: loadHojinHoldings,
  saveCurrentHoldings: saveHojinHoldings,
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

/**
 * 法人資産管理ツールの全データを削除する（追加実装4章：全データリセット機能）。
 * 法人保有資産・記録履歴は常に削除する。目標資産額・個人化想定比率（設定値）は
 * includeSettingsがtrueのときのみ削除。移転履歴ログ（transferLog.ts）はこの関数の
 * 対象外（呼び出し元がclearTransferLogを別途呼ぶこと、モジュールの責務を分離するため）。
 * 取り消せない操作であり、呼び出し元（UI）で確認ダイアログを表示してから呼ぶこと。
 */
export function resetAll(options: { includeSettings: boolean }): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HOJIN_HOLDINGS_KEY);
  localStorage.removeItem(SNAPSHOTS_KEY);
  if (options.includeSettings) {
    localStorage.removeItem(TARGET_KEY);
    localStorage.removeItem(PERSONALIZATION_RATIO_KEY);
  }
}
