'use client';

import { create } from 'zustand';
import { simulate, analyze, runMC } from '@/lib';
import type { YearSnap, AnalysisResult, MCResult, WithdrawalStrategy, LifeEvent } from '@/lib/types';
import type { ProfileV3, AssetRow } from '@/lib/profile';
import { profileToSimParams, SAMPLE_PROFILE, calcMu, calcAggregatedSigma } from '@/lib/profile';

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
      set({ profile: newProfile, snaps, analysis, mcResult: null });
    },

    updateEvents: (events) => {
      const { profile, activeStrategies } = get();
      const newProfile: ProfileV3 = { ...profile, events };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null });
    },

    runSimulation: () => {
      const { profile, activeStrategies } = get();
      const { snaps, analysis } = runAll(profile, activeStrategies);
      set({ snaps, analysis, mcResult: null });
    },

    runMonteCarlo: () => {
      const { profile, activeStrategies } = get();
      set({ isMcRunning: true });
      const p = profileToSimParams(profile);
      const evs = profile.events;
      const result = runMC(p, evs, activeStrategies, 1000);
      set({ mcResult: result, isMcRunning: false, mode: 'mc' });
    },

    loadProfile: (profile) => {
      const { activeStrategies } = get();
      const { snaps, analysis } = runAll(profile, activeStrategies);
      set({ profile, snaps, analysis, mcResult: null });
    },

    updatePortfolio: (phase, acct, rows) => {
      const { profile, activeStrategies } = get();
      const newPortfolio = {
        ...profile.portfolio,
        [phase]: { ...profile.portfolio[phase], [acct]: rows },
      };
      let paramPatch: Partial<ProfileV3['params']> = {};

      // current PF編集時: amount合計をbNisa/bIdeco/bTaxに即時同期
      if (phase === 'current') {
        const cur = newPortfolio.current;
        paramPatch.bNisa  = cur.nisa.reduce((s, r) => s + (r.amount ?? 0), 0);
        paramPatch.bIdeco = cur.ideco.reduce((s, r) => s + (r.amount ?? 0), 0);
        paramPatch.bTax   = cur.tax.reduce((s, r) => s + (r.amount ?? 0), 0);
      }

      if (phase === 'working') {
        const nisa  = newPortfolio.working.nisa;
        const ideco = newPortfolio.working.ideco;
        const tax   = newPortfolio.working.tax;
        // μは口座別（変更なし）
        if (!profile.params.pfManualFlags['rWNisa'])  paramPatch.rWNisa  = parseFloat(calcMu(nisa).toFixed(1));
        if (!profile.params.pfManualFlags['rWIdeco']) paramPatch.rWIdeco = parseFloat(calcMu(ideco).toFixed(1));
        if (!profile.params.pfManualFlags['rWTax'])   paramPatch.rWTax   = parseFloat(calcMu(tax).toFixed(1));
        // σは残高加重集計（修正済み）
        if (!profile.params.pfManualFlags['mcStd']) {
          const sigma = calcAggregatedSigma(
            [nisa, ideco, tax],
            [profile.params.bNisa,   profile.params.bIdeco,   profile.params.bTax],
          );
          if (sigma !== null) paramPatch.mcStd = parseFloat(sigma.toFixed(1));
        }
      }

      if (phase === 'retirement') {
        if (newPortfolio.retirement.sameAsWorking) {
          // sameAsWorking=true: mcStdRはmcStdと同値に同期
          if (!profile.params.pfManualFlags['mcStdR']) {
            const sigma = calcAggregatedSigma(
              [newPortfolio.working.nisa, newPortfolio.working.ideco, newPortfolio.working.tax],
              [profile.params.bNisa,   profile.params.bIdeco,   profile.params.bTax],
            );
            if (sigma !== null) paramPatch.mcStdR = parseFloat(sigma.toFixed(1));
          }
        } else {
          const nisa  = newPortfolio.retirement.nisa;
          const ideco = newPortfolio.retirement.ideco;
          const tax   = newPortfolio.retirement.tax;
          if (!profile.params.pfManualFlags['rRNisa'])  paramPatch.rRNisa  = parseFloat(calcMu(nisa).toFixed(1));
          if (!profile.params.pfManualFlags['rRIdeco']) paramPatch.rRIdeco = parseFloat(calcMu(ideco).toFixed(1));
          if (!profile.params.pfManualFlags['rRTax'])   paramPatch.rRTax   = parseFloat(calcMu(tax).toFixed(1));
          if (!profile.params.pfManualFlags['mcStdR']) {
            const sigma = calcAggregatedSigma(
              [nisa, ideco, tax],
              [profile.params.bNisa,   profile.params.bIdeco,   profile.params.bTax],
            );
            if (sigma !== null) paramPatch.mcStdR = parseFloat(sigma.toFixed(1));
          }
        }
      }

      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...paramPatch },
        portfolio: newPortfolio,
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null });
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
      set({ profile: newProfile, snaps, analysis, mcResult: null });
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
        // コピーされた口座もされなかった口座も、μは現在のworking rowsから再計算
        const flagKey = `rW${acct[0].toUpperCase()}${acct.slice(1)}`;
        if (!profile.params.pfManualFlags[flagKey]) {
          paramPatch[flagKey as keyof ProfileV3['params']] =
            parseFloat(calcMu(newWorking[acct]).toFixed(1)) as never;
        }
      }

      // 口座残高をprofile.paramsに同期（bNisa/bIdeco/bTax）
      if (bNisa > 0)  paramPatch.bNisa  = bNisa;
      if (bIdeco > 0) paramPatch.bIdeco = bIdeco;
      if (bTax > 0)   paramPatch.bTax   = bTax;

      // σ計算: currentのamount合計を口座残高として使い、残高加重で集計（修正済み）
      const aggSigmaW = calcAggregatedSigma(
        [newWorking.nisa, newWorking.ideco, newWorking.tax],
        [bNisa, bIdeco, bTax],
      );
      if (aggSigmaW !== null) {
        if (!profile.params.pfManualFlags['mcStd'])  paramPatch.mcStd  = parseFloat(aggSigmaW.toFixed(1));
        // sameAsWorking=true のとき取崩期σも同値に同期
        if (!profile.params.pfManualFlags['mcStdR'] && profile.portfolio.retirement.sameAsWorking) {
          paramPatch.mcStdR = parseFloat(aggSigmaW.toFixed(1));
        }
      }

      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...paramPatch },
        portfolio: { ...profile.portfolio, working: newWorking },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null });
    },

    setSameAsWorking: (val) => {
      const { profile, activeStrategies } = get();
      let paramPatch: Partial<ProfileV3['params']> = {};
      // sameAsWorking=true に切り替えたとき、mcStdRをmcStdに同期
      if (val && !profile.params.pfManualFlags['mcStdR']) {
        paramPatch.mcStdR = profile.params.mcStd;
      }
      const newProfile: ProfileV3 = {
        ...profile,
        params: { ...profile.params, ...paramPatch },
        portfolio: {
          ...profile.portfolio,
          retirement: { ...profile.portfolio.retirement, sameAsWorking: val },
        },
      };
      const { snaps, analysis } = runAll(newProfile, activeStrategies);
      set({ profile: newProfile, snaps, analysis, mcResult: null });
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
