'use client';

// 資産管理ツール専用の新規プロファイルストア（companyStateStore.tsと同系統：
// zustand create + get/set、更新のたびにlocalStorageへ保存）。useSimulatorStoreには一切依存しない
// （instruction_phase2_profile_foundation.md 6節）。プロファイル一覧・現在選択中プロファイルを
// リアクティブに保持し、切替時にUI（保有資産一覧・グラフ・CompanyState等）が即座に更新される
// ようにする。

import { create } from 'zustand';
import type { AssetManagerProfile } from './profileTypes';
import {
  DEFAULT_PROFILE_ID,
  loadProfiles as loadProfilesRaw,
  saveProfiles as saveProfilesRaw,
  loadCurrentProfileId as loadCurrentProfileIdRaw,
  saveCurrentProfileId as saveCurrentProfileIdRaw,
} from './profileStorage';
import { ensureAssetManagerMigrated } from './profileMigration';
import { loadHoldings, saveHoldings, loadSnapshots, saveSnapshots } from './storage';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots as loadHojinSnapshots,
  saveSnapshots as saveHojinSnapshots,
} from '../hojinAssetManagement/storage';

interface CreateProfileInput {
  name: string;
  birthDate?: string | null;
  linkedSimulatorProfileId?: number | null;
}

interface AssetManagerProfileStore {
  profiles: AssetManagerProfile[];
  currentProfileId: string;
  createProfile: (input: CreateProfileInput) => AssetManagerProfile;
  switchProfile: (id: string) => void;
  /** 選択中プロファイルとそれに属する保有資産・スナップショット履歴・CompanyStateをまとめて
   * カスケード削除する。リンク先のシミュレータープロファイル自体は削除しない（参照であり所有
   * 関係ではないため）。プロファイルが0件にならないよう、残り1件のときは何もしない（no-op）。 */
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, name: string) => void;
  linkSimulatorProfile: (id: string, simulatorProfileId: number) => void;
  /** linkedSimulatorProfileIdをnullにするのは、ユーザーが明示的にこの操作を行ったときのみ
   * （リンク切れを検知しても自動でnullにはしない）。 */
  unlinkSimulatorProfile: (id: string) => void;
}

function initialProfiles(): AssetManagerProfile[] {
  if (typeof window === 'undefined') return [];
  ensureAssetManagerMigrated();
  return loadProfilesRaw();
}

function initialCurrentProfileId(): string {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_ID;
  ensureAssetManagerMigrated();
  return loadCurrentProfileIdRaw() ?? DEFAULT_PROFILE_ID;
}

export const useAssetManagerProfileStore = create<AssetManagerProfileStore>((set, get) => ({
  profiles: initialProfiles(),
  currentProfileId: initialCurrentProfileId(),

  createProfile: (input) => {
    const profile: AssetManagerProfile = {
      id: crypto.randomUUID(),
      name: input.name,
      birthDate: input.birthDate ?? null,
      linkedSimulatorProfileId: input.linkedSimulatorProfileId ?? null,
    };
    const next = [...get().profiles, profile];
    saveProfilesRaw(next);
    set({ profiles: next });
    return profile;
  },

  switchProfile: (id) => {
    saveCurrentProfileIdRaw(id);
    set({ currentProfileId: id });
  },

  deleteProfile: (id) => {
    const { profiles, currentProfileId } = get();
    if (profiles.length <= 1) return; // プロファイルが0件になる操作は許可しない

    const remaining = profiles.filter((p) => p.id !== id);
    if (remaining.length === profiles.length) return; // 該当idが無ければ何もしない
    saveProfilesRaw(remaining);

    saveHoldings(loadHoldings().filter((h) => h.profileId !== id));
    saveSnapshots(loadSnapshots().filter((s) => s.profileId !== id));
    saveHojinHoldings(loadHojinHoldings().filter((h) => h.profileId !== id));
    saveHojinSnapshots(loadHojinSnapshots().filter((s) => s.profileId !== id));
    // instruction_phase2_companystate_rearchitecture.md 1節：CompanyStateはシミュレーター
    // プロファイル単位で持つため、資産管理ツールプロファイル削除時のカスケード削除は不要（削除済み）。

    let nextCurrentId = currentProfileId;
    if (currentProfileId === id) {
      nextCurrentId = remaining[0].id;
      saveCurrentProfileIdRaw(nextCurrentId);
    }
    set({ profiles: remaining, currentProfileId: nextCurrentId });
  },

  renameProfile: (id, name) => {
    const next = get().profiles.map((p) => (p.id === id ? { ...p, name } : p));
    saveProfilesRaw(next);
    set({ profiles: next });
  },

  linkSimulatorProfile: (id, simulatorProfileId) => {
    const next = get().profiles.map((p) => (p.id === id ? { ...p, linkedSimulatorProfileId: simulatorProfileId } : p));
    saveProfilesRaw(next);
    set({ profiles: next });
  },

  unlinkSimulatorProfile: (id) => {
    const next = get().profiles.map((p) => (p.id === id ? { ...p, linkedSimulatorProfileId: null } : p));
    saveProfilesRaw(next);
    set({ profiles: next });
  },
}));
