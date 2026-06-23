import type { ProfileV3 } from './profile';

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

export function saveProfile(profile: ProfileV3): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = { ...profile, savedAt: new Date().toISOString() };
  } else {
    profiles.push({ ...profile, savedAt: new Date().toISOString() });
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
