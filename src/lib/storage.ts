import type { ProfileV3 } from './profile';
import { getEffectiveRW, getEffectiveRR, getEffectiveMcStd, getEffectiveMcStdR } from './profile';
import { useSimulatorStore } from '../store/simulatorStore';
import { useCompanyStateStore } from './hojinCompanyState/companyStateStore';
import { saveCompanyStateForProfile, getCompanyStateForProfile } from './hojinCompanyState/storageByProfile';
import type { CompanyState } from './hojinCompanyState/types';
import { EMPTY_COMPANY_STATE } from './hojinCompanyState/types';

const STORAGE_KEY = 'lifeCompassProfiles';
const MAX_PROFILES = 10;

export function loadProfiles(): ProfileV3[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProfileV3[]) : [];
  } catch {
    return [];
  }
}

// 自動モード(pfManualFlags=false)の項目は、保存直前に実際にシミュレーションへ渡っている
// ライブ値(getEffectiveRW/RR/McStd/McStdR)でparamsを上書きしてから書き出す。JSONを直接
// 見た人間が、実際には使われていない古いスナップショット値に惑わされないようにするため。
// 手動モード(pfManualFlags=true)の項目はユーザー指定値のため触らない。
// 読み込み側(profileToSimParams等)の再計算ロジックは変更しないため、計算結果には影響しない。
function withEffectiveValuesSynced(profile: ProfileV3): ProfileV3 {
  const flags = profile.params.pfManualFlags;
  const patch: Partial<ProfileV3['params']> = {};
  (['Nisa', 'Ideco', 'Tax'] as const).forEach(acct => {
    const rWKey = `rW${acct}` as 'rWNisa' | 'rWIdeco' | 'rWTax';
    const rRKey = `rR${acct}` as 'rRNisa' | 'rRIdeco' | 'rRTax';
    if (!flags[rWKey]) patch[rWKey] = getEffectiveRW(profile, acct);
    if (!flags[rRKey]) patch[rRKey] = getEffectiveRR(profile, acct);
  });
  if (!flags['mcStd'])  patch.mcStd  = getEffectiveMcStd(profile);
  if (!flags['mcStdR']) patch.mcStdR = getEffectiveMcStdR(profile);
  return { ...profile, params: { ...profile.params, ...patch } };
}

export function saveProfile(profile: ProfileV3): void {
  const synced = withEffectiveValuesSynced(profile);
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === synced.id);
  if (idx >= 0) {
    profiles[idx] = { ...synced, savedAt: new Date().toISOString() };
  } else {
    profiles.push({ ...synced, savedAt: new Date().toISOString() });
  }
  if (profiles.length > MAX_PROFILES) profiles.splice(0, profiles.length - MAX_PROFILES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  // instruction_phase2_profile_linking.md 1節：ProfileDrawer.tsx（変更禁止）はこの関数を経由して
  // 保存するため、新規/上書き問わずここでcurrentProfileIdを確定済みのidに同期する。
  // 2026-09-05バグ修正：以前はcurrentProfileIdのみ同期しており、useSimulatorStoreのprofile
  // オブジェクト自体（.id/.name含む）は古い値のまま据え置かれていた。ProfileDrawer.tsxの
  // handleSave（別名保存）は{ ...profile, id, name }という新しいオブジェクトをこの関数に
  // 渡すだけで、呼び出し元のuseSimulatorStore.profile自体は更新されないため、保存直後に
  // 「JSONでエクスポート」等、profileをライブ参照する処理を行うと、保存したはずの新しい
  // プロファイルではなく保存前の古いプロファイルの内容が使われてしまっていた
  // （instruction_json_export_import_companystate.md実装時の実機確認で発見）。
  // ここでprofileもsyncedに差し替えることで、保存後は常にライブ状態と永続化済みの内容が
  // 一致するようにする。
  if (typeof window !== 'undefined') {
    useSimulatorStore.setState({ currentProfileId: synced.id, profile: synced });
    // instruction_phase2_companystate_rearchitecture.md 1.2節：CompanyStateもこのプロファイルの
    // 保存操作に相乗りする。新規保存・上書き保存いずれの場合も、その時点でメモリ上にある
    // CompanyStateをそのまま対象idへ書き込む（別名保存で新IDに現在の値がコピーされる、という
    // 個人側portfolio.currentと同じ挙動を自然に満たす）。
    saveCompanyStateForProfile(synced.id, useCompanyStateStore.getState().state);
  }
}

export function deleteProfile(id: number): void {
  const profiles = loadProfiles().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function encodeProfileUrl(profile: ProfileV3): string {
  const json = JSON.stringify(profile);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeProfileUrl(s: string): ProfileV3 {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as ProfileV3;
}

// instruction_json_export_import_companystate.md：ProfileDrawer.tsx（ロック対象、変更不可）の
// 「JSONでエクスポート」「JSONをインポート」は、この2関数を経由するように最小限の差し替えのみ
// 行う（handleExport/handleImport内部のロジック自体はProfileDrawer.tsxに残したまま、
// JSON生成／パースの1行ずつだけをこちらの関数呼び出しに置き換える）。

type ProfileExportJson = ProfileV3 & { companyState?: CompanyState | null };

function isEmptyCompanyState(state: CompanyState): boolean {
  return JSON.stringify(state) === JSON.stringify(EMPTY_COMPANY_STATE);
}

/** プロファイルJSONを生成する。法人設定（companyStateByProfile）が空でなければcompanyStateフィールドを含める。 */
export function exportProfileToJson(profile: ProfileV3): string {
  const companyState = getCompanyStateForProfile(profile.id);
  const withCompanyState: ProfileExportJson = isEmptyCompanyState(companyState)
    ? { ...profile }
    : { ...profile, companyState };
  return JSON.stringify(withCompanyState, null, 2);
}

/**
 * プロファイルJSONを読み込む。companyStateフィールドの有無・値に応じて、取り込み先プロファイルID
 * （＝JSON内のprofile.id。ProfileDrawer.tsxのhandleImportはこのidをそのままloadProfile()に渡し、
 * currentProfileIdに採用するため、ここで書き込むキーもそれに合わせる）の法人設定を更新する：
 *   - フィールドが存在しない（旧形式）→ 何もしない（既存の法人設定を一切変更・削除しない）
 *   - フィールドがnull → 明示的に「法人設定なし」。EMPTY_COMPANY_STATEにリセットする
 *   - フィールドが値を持つ → その値で上書きする
 * 戻り値は companyState フィールドを取り除いた素のProfileV3（loadProfile()にそのまま渡せる形）。
 */
export function importProfileFromJson(json: string): ProfileV3 {
  const parsed = JSON.parse(json) as ProfileExportJson;
  const { companyState, ...profile } = parsed;
  if (typeof window !== 'undefined' && 'companyState' in parsed) {
    saveCompanyStateForProfile(profile.id, companyState === null ? EMPTY_COMPANY_STATE : (companyState as CompanyState));
  }
  return profile as ProfileV3;
}
