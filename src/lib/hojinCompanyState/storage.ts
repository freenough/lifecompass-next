import type { CompanyState } from './types';
import { EMPTY_COMPANY_STATE } from './types';

// 個人側・資産管理ツール側のいずれとも完全に分離した専用キー（5.3節）。
const COMPANY_STATE_KEY = 'hojinCompanyState';

export function loadCompanyState(): CompanyState {
  if (typeof window === 'undefined') return EMPTY_COMPANY_STATE;
  try {
    const raw = localStorage.getItem(COMPANY_STATE_KEY);
    if (!raw) return EMPTY_COMPANY_STATE;
    const parsed = JSON.parse(raw) as Partial<CompanyState>;
    return {
      events: parsed.events ?? EMPTY_COMPANY_STATE.events,
      portfolio: {
        ...EMPTY_COMPANY_STATE.portfolio,
        ...parsed.portfolio,
      },
      settings: {
        ...EMPTY_COMPANY_STATE.settings,
        ...parsed.settings,
      },
    };
  } catch {
    return EMPTY_COMPANY_STATE;
  }
}

export function saveCompanyState(state: CompanyState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COMPANY_STATE_KEY, JSON.stringify(state));
}
