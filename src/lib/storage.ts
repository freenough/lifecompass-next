import type { ProfileV3 } from './profile';
import { getEffectiveRW, getEffectiveRR, getEffectiveMcStd, getEffectiveMcStdR } from './profile';

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
