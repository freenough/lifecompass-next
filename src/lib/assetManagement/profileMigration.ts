// フェーズ2プロファイル基盤の移行処理（instruction_phase2_profile_foundation.md 3節）。
// 「assetManagerProfilesが空なら実行」という単純な条件では不十分（デフォルトプロファイル作成
// 直後・currentProfileId保存前にタブが閉じられる等で不完全な状態が残りうる）ため、
// バージョン未達時は毎回「現在の実際の状態を検査し、不足している処理だけを補完する」方式にする。
// 冪等（2回連続実行しても結果が変わらない）。

import type { AssetManagerProfile } from './profileTypes';
import {
  DEFAULT_PROFILE_ID,
  loadProfiles,
  saveProfiles,
  loadCurrentProfileId,
  saveCurrentProfileId,
  loadMigrationVersion,
  saveMigrationVersion,
} from './profileStorage';

const CURRENT_MIGRATION_VERSION = 1;

/**
 * バージョン未達時、以下を（既に満たされていればスキップしつつ）順に確認・実行する。
 * 2回連続で呼んでも結果が変わらない（冪等）。
 */
export function ensureAssetManagerMigrated(): void {
  if (typeof window === 'undefined') return;
  if (loadMigrationVersion() >= CURRENT_MIGRATION_VERSION) return;

  // 1. デフォルトプロファイルが存在しなければ作成する
  const profiles = loadProfiles();
  if (!profiles.some((p) => p.id === DEFAULT_PROFILE_ID)) {
    const defaultProfile: AssetManagerProfile = {
      id: DEFAULT_PROFILE_ID,
      name: 'デフォルト',
      birthDate: null,
      linkedSimulatorProfileId: null,
    };
    saveProfiles([...profiles, defaultProfile]);
  }

  // 2. currentProfileIdが未設定なら、デフォルトプロファイルのidを設定する
  if (!loadCurrentProfileId()) {
    saveCurrentProfileId(DEFAULT_PROFILE_ID);
  }

  // 3. （instruction_phase2_companystate_rearchitecture.md 1節により撤去）hojinCompanyStateの
  //    旧形式マップ変換は、CompanyStateがシミュレータープロファイル単位（companyStateByProfile）
  //    へ移行したことで不要になった。

  // 4. 上記すべてが完了した後、最後にバージョンを更新する
  saveMigrationVersion(CURRENT_MIGRATION_VERSION);
}
