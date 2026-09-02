import type { AssetManagerProfile } from './profileTypes';

// 既存の'lifeCompassAssetHoldings'等（同ディレクトリのstorage.ts）とは別の新規キー
// （instruction_phase2_profile_foundation.md 1節）。
const PROFILES_KEY = 'assetManagerProfiles';
const CURRENT_PROFILE_ID_KEY = 'assetManagerCurrentProfileId';
const MIGRATION_VERSION_KEY = 'assetManagerMigrationVersion';

// 移行で作られる最初の（デフォルト）プロファイルだけが使う予約ID。新規作成では絶対に使わない
// （4節：AssetHolding/AssetSnapshotが既に持つprofileId:'default'固定データと紐付けるため）。
export const DEFAULT_PROFILE_ID = 'default';

export function loadProfiles(): AssetManagerProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssetManagerProfile[]) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: AssetManagerProfile[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadCurrentProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_PROFILE_ID_KEY);
}

export function saveCurrentProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_PROFILE_ID_KEY, id);
}

export function loadMigrationVersion(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(MIGRATION_VERSION_KEY);
  const n = raw ? Number(raw) : 0;
  return isNaN(n) ? 0 : n;
}

export function saveMigrationVersion(version: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATION_VERSION_KEY, String(version));
}
