'use client';

import { create } from 'zustand';
import { simulate, analyze, runMC } from '@/lib';
import type { YearSnap, AnalysisResult, MCResult, WithdrawalStrategy, LifeEvent } from '@/lib/types';
import type { ProfileV3, AssetRow } from '@/lib/profile';
import { profileToSimParams, SAMPLE_PROFILE, getUnconfiguredAccounts, getEffectiveRW, getEffectiveMcStd } from '@/lib/profile';

type PortfolioPhase   = 'current' | 'working' | 'retirement';
type PortfolioAcct    = 'nisa' | 'ideco' | 'tax';
type SpPortfolioAcct  = 'spNisa' | 'spIdeco' | 'spTax';

export type ScenarioKey = 'optimistic' | 'neutral' | 'pessimistic';

function loadInitialProfile(): ProfileV3 {
  if (typeof window === 'undefined') return SAMPLE_PROFILE;
  try {
    const raw = localStorage.getItem('lifeCompassProfiles');
    if (raw) {
      const profiles = JSON.parse(raw) as ProfileV3[];
      if (Array.isArray(profiles) && profiles.length > 0) {
        const loaded = profiles[profiles.length - 1];
        return {
          ...SAMPLE_PROFILE,
          ...loaded,
          params:    { ...SAMPLE_PROFILE.params,    ...loaded.params    },
          portfolio: { ...SAMPLE_PROFILE.portfolio, ...loaded.portfolio },
        };
      }
    }
  } catch {
    // ignore
  }
  return SAMPLE_PROFILE;
}

function runAll(profile: ProfileV3, strategies: WithdrawalStrategy[]): {
  snaps: Record<string, YearSnap[]>;
  analysis: Record<string, AnalysisResult>;
} {
  const p = profileToSimParams(profile);
  const evs = profile.events;
  const snaps: Record<string, YearSnap[]> = {};
  const analysis: Record<string, AnalysisResult> = {};
  for (const st of strategies) {
    const s = simulate(p, evs, st);
    snaps[st]    = s;
    analysis[st] = analyze(s, p);
  }
  return { snaps, analysis };
}

interface SimulatorState {
  profile: ProfileV3;
  snaps: Record<string, YearSnap[]>;
  analysis: Record<string, AnalysisResult>;
  mcResult: MCResult | null;
  mcError: string | null;
  mode: 'fixed' | 'mc';
  cmpMode: 'strategy' | 'scenario';
  activeStrategies: WithdrawalStrategy[];
  activeScenarios: ScenarioKey[];
  isMcRunning: boolean;
  updateProfile: (patch: Partial<ProfileV3['params']>) => void;
  updateEvents: (events: LifeEvent[]) => void;
  updatePortfolio: (phase: PortfolioPhase, acct: PortfolioAcct, rows: AssetRow[]) => void;
  updateSpousePortfolio: (acct: SpPortfolioAcct, rows: AssetRow[]) => void;
  copyCurrentToWorking: () => void;
  setSameAsWorking: (val: boolean) => void;
  setRateSameAsWorking: (val: boolean) => void;
  setSigmaSameAsWorking: (val: boolean) => void;
  runSimulation: () => void;
  runMonteCarlo: () => void;
  loadProfile: (profile: ProfileV3) => void;
  setMode: (mode: 'fixed' | 'mc') => void;
  setCmpMode: (cmpMode: 'strategy' | 'scenario') => void;
  setActiveStrategies: (strategies: WithdrawalStrategy[]) => void;
  setActiveScenarios: (scenarios: ScenarioKey[]) => void;
}

const INITIAL_STRATEGIES: WithdrawalStrategy[] = ['proportional'];

export const useSimulatorStore = create<SimulatorState>((set, get) => {
  const initial = loadInitialProfile();
  const { snaps, analysis } = runAll(initial, INITIAL_STRATEGIES);

  return {
    profile: initial,
    snaps,
    analysis,
    mcResult: null,
    mcError: null,
    mode: 'fixed',
    cmpMode: 'strategy',
    activeStrategies: INITIAL_STRATEGIES,
    activeScenarios: ['neutral'],
    isMcRunning: false,

    updateProfile: (patch) => {
      const { profile, activeStrategies } = get();
      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...patch },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    updateEvents: (events) => {
      const { profile, activeStrategies } = get();
      const newProfile: ProfileV3 = { ...profile, events };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    runSimulation: () => {
      const { profile, activeStrategies } = get();
      const { snaps, analysis } = runAll(profile, activeStrategies);
      set({ snaps, analysis, mcResult: null, mcError: null });
    },

    runMonteCarlo: () => {
      const { profile, activeStrategies } = get();
      const unconfigured = getUnconfiguredAccounts(profile);
      if (unconfigured.length > 0) {
        set({
          mcError: `${unconfigured.join('、')}の資産配分が未設定です。ポートフォリオに1行追加するか、利回り設定で直接利回りを入力してください`,
          mode: 'mc',
        });
        return;
      }
      set({ isMcRunning: true, mcError: null });
      const p = profileToSimParams(profile);
      const evs = profile.events;
      const result = runMC(p, evs, activeStrategies, 1000);
      set({ mcResult: result, isMcRunning: false, mode: 'mc' });
    },

    loadProfile: (profile) => {
      const { activeStrategies } = get();
      const { snaps, analysis } = runAll(profile, activeStrategies);
      set({ profile, snaps, analysis, mcResult: null, mcError: null });
    },

    updatePortfolio: (phase, acct, rows) => {
      const { profile, activeStrategies } = get();
      const newPortfolio = {
        ...profile.portfolio,
        [phase]: { ...profile.portfolio[phase], [acct]: rows },
      };
      const paramPatch: Partial<ProfileV3['params']> = {};

      // current PF編集時: amount合計をbNisa/bIdeco/bTaxに即時同期
      if (phase === 'current') {
        const cur = newPortfolio.current;
        paramPatch.bNisa  = cur.nisa.reduce((s, r) => s + (r.amount ?? 0), 0);
        paramPatch.bIdeco = cur.ideco.reduce((s, r) => s + (r.amount ?? 0), 0);
        paramPatch.bTax   = cur.tax.reduce((s, r) => s + (r.amount ?? 0), 0);
      }

      // rW/rR（μ）・mcStd/mcStdR（σ）はいずれもgetEffectiveRW/RR・getEffectiveMcStd/StdR経由の
      // 算出値に一本化したため、ここでの同期は不要（各表示が再レンダリングで自動追従する）

      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...paramPatch },
        portfolio: newPortfolio,
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    updateSpousePortfolio: (acct, rows) => {
      const { profile, activeStrategies } = get();
      const newCurrent = { ...profile.portfolio.current, [acct]: rows };
      // Sync spNisaBal/spIdecoBal/spTaxBal from spouse portfolio rows
      const spNisaBal  = (newCurrent.spNisa  ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const spIdecoBal = (newCurrent.spIdeco ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const spTaxBal   = (newCurrent.spTax   ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, spNisaBal, spIdecoBal, spTaxBal },
        portfolio: { ...profile.portfolio, current: newCurrent },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    copyCurrentToWorking: () => {
      const { profile, activeStrategies } = get();
      const cur = profile.portfolio.current;
      const accts: PortfolioAcct[] = ['nisa', 'ideco', 'tax'];

      // Convert current portfolio (amount 万円) → working portfolio (pct %)
      const newWorking = { ...profile.portfolio.working };
      let paramPatch: Partial<ProfileV3['params']> = {};

      // 口座残高 = current portfolioのamount合計
      const bNisa  = cur.nisa.reduce((s, r) => s + (r.amount ?? 0), 0);
      const bIdeco = cur.ideco.reduce((s, r) => s + (r.amount ?? 0), 0);
      const bTax   = cur.tax.reduce((s, r) => s + (r.amount ?? 0), 0);

      for (const acct of accts) {
        const rows = cur[acct];
        const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
        if (total) {
          // currentに金額が入っている口座: 比率をコピー
          newWorking[acct] = rows.map(r => ({
            assetClass: r.assetClass,
            pct: Math.round(((r.amount ?? 0) / total) * 1000) / 10,
          }));
        }
        // rW（μ）はgetEffectiveRW経由の算出値に一本化したため、ここでの同期は不要
      }

      // 口座残高をprofile.paramsに同期（bNisa/bIdeco/bTax）
      if (bNisa > 0)  paramPatch.bNisa  = bNisa;
      if (bIdeco > 0) paramPatch.bIdeco = bIdeco;
      if (bTax > 0)   paramPatch.bTax   = bTax;

      // σ（mcStd/mcStdR）はgetEffectiveMcStd/StdR経由の算出値に一本化したため、ここでの同期は不要

      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...paramPatch },
        portfolio: { ...profile.portfolio, working: newWorking },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    setSameAsWorking: (val) => {
      // PF側「同じPFを使う」は資産配分の同期のみに専念する（σ/mcStdRは
      // sigmaSameAsWorking経由の独立したgetterで扱うため、ここでは動かさない）。
      const { profile, activeStrategies } = get();
      const newProfile: ProfileV3 = {
        ...profile,
        portfolio: {
          ...profile.portfolio,
          retirement: { ...profile.portfolio.retirement, sameAsWorking: val },
        },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    setRateSameAsWorking: (val) => {
      const { profile, activeStrategies } = get();
      const paramPatch: Partial<ProfileV3['params']> = { rateSameAsWorking: val };
      if (!val) {
        // OFFにした瞬間、その時点の積立期側の実効値を取崩期用の独立値としてコピーし、
        // 以降は「PF計算値を使う」フラグをOFF（手動）にして個別に編集可能にする。
        // ONの間は独立したstateを持たず、常にgetEffectiveRW経由の算出値を参照する（同期漏れ防止）。
        const flags = { ...profile.params.pfManualFlags };
        (['Nisa', 'Ideco', 'Tax'] as const).forEach(acct => {
          const valueKey = `rR${acct}` as 'rRNisa' | 'rRIdeco' | 'rRTax';
          paramPatch[valueKey] = getEffectiveRW(profile, acct);
          flags[`rR${acct}`] = true;
        });
        paramPatch.pfManualFlags = flags;
      }
      const newProfile: ProfileV3 = { ...profile, params: { ...profile.params, ...paramPatch } };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    setSigmaSameAsWorking: (val) => {
      const { profile, activeStrategies } = get();
      const paramPatch: Partial<ProfileV3['params']> = { sigmaSameAsWorking: val };
      if (!val) {
        // OFFにした瞬間、その時点の積立期側の実効σを取崩期用の独立値としてコピーし、
        // 以降は「PF計算値を使う」フラグをOFF（手動）にして個別に編集可能にする。
        // ONの間は独立したstateを持たず、常にgetEffectiveMcStd経由の算出値を参照する（同期漏れ防止）。
        paramPatch.mcStdR = getEffectiveMcStd(profile);
        paramPatch.pfManualFlags = { ...profile.params.pfManualFlags, mcStdR: true };
      }
      const newProfile: ProfileV3 = { ...profile, params: { ...profile.params, ...paramPatch } };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null, mcError: null });
    },

    setMode: (mode) => set({ mode }),
    setCmpMode: (cmpMode) => {
      const updates: Partial<SimulatorState> = { cmpMode };
      if (cmpMode === 'scenario') updates.mode = 'fixed';
      set(updates);
    },
    setActiveStrategies: (activeStrategies) => {
      const { profile } = get();
      const { snaps, analysis } = runAll(profile, activeStrategies);
      set({ activeStrategies, snaps, analysis });
    },
    setActiveScenarios: (activeScenarios) => set({ activeScenarios }),
  };
});
