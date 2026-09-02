// 資産管理ツールの「プロファイル」（フェーズ2）。1プロファイル＝1人物の保有資産・
// スナップショット履歴・法人設定（CompanyState）をまとめる単位。
// シミュレーター側ProfileV3（src/lib/profile.ts、ロック対象）とは完全に独立した型
// （instruction_phase2_profile_foundation.md 1節）。

export interface AssetManagerProfile {
  id: string; // 新規作成時は常にcrypto.randomUUID()。'default'は移行専用の予約ID（profileMigration.ts参照）
  name: string;
  birthDate: string | null; // 'YYYY-MM-DD'
  linkedSimulatorProfileId: number | null; // lifeCompassProfiles内のid。片方向参照、所有関係ではない
}
