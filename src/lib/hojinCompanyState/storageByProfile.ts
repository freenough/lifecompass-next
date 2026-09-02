// CompanyStateをシミュレータープロファイル単位（useSimulatorStore.currentProfileId、数値）で
// 永続化するストレージ層（instruction_phase2_companystate_rearchitecture.md 1.1節）。
// 旧・資産管理ツールプロファイル単位のstorage.ts（getCompanyState/saveCompanyState、文字列キー）
// とは別物として新設する（キー空間が異なるため、既存関数の引数型を緩めるのではなく別ファイルにする）。

import type { CompanyState } from './types';
import { EMPTY_COMPANY_STATE } from './types';

const KEY = 'companyStateByProfile';

function loadMap(): Record<number, CompanyState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<number, CompanyState>) : {};
  } catch {
    return {};
  }
}

function saveMap(map: Record<number, CompanyState>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getCompanyStateForProfile(profileId: number): CompanyState {
  const map = loadMap();
  return map[profileId] ?? EMPTY_COMPANY_STATE;
}

export function saveCompanyStateForProfile(profileId: number, state: CompanyState): void {
  const map = loadMap();
  map[profileId] = state;
  saveMap(map);
}
