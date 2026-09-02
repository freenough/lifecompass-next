'use client';

// 法人資産（CompanyState）専用の新規ストア。既存simulatorStore.ts（ロック対象）の実装パターン
// （zustand create + get/set）を参考にしつつ、完全に新規作成する。
//
// instruction_phase2_companystate_rearchitecture.md（1〜2節）：CompanyStateは資産管理ツール側
// プロファイルではなく、シミュレータープロファイル自体の一部として扱う（個人側の①現在PFと同じ
// 位置づけ）。切替・保存は simulatorStore.ts の loadProfile()／src/lib/storage.ts の saveProfile()
// （ProfileDrawer.tsxの唯一の読込・保存操作）に相乗りする。このストア自体は下書き（isDirty）や
// 専用の保存アクションを持たない——ユーザーがシミュレーター側で行う保存操作がそのままCompanyStateの
// 保存を兼ねるため（個人側の他フィールドと同じ扱い。CorporateSettingsSection.tsx側の専用保存UIは
// 撤去済み）。資産管理ツール側プロファイルの切替には一切追従しない（useAssetManagerProfileStoreへの
// 依存なし）。

import { create } from 'zustand';
import type { CompanyState, CorporateLifeEvent, CorporatePortfolioPhase } from './types';
import { EMPTY_COMPANY_STATE } from './types';
import { getCompanyStateForProfile } from './storageByProfile';
import { getEffectivePhaseMetrics } from './portfolioMath';
import type { CombinedMcResult } from './mc';

type PortfolioPhaseKey = 'current' | 'working' | 'retirement';

interface CompanyStateStore {
  /** 現在読み込み中のシミュレータープロファイルのID。 */
  currentProfileId: number | null;
  state: CompanyState;
  // 合算MC結果（3.7節：「合算MCの結果はcompanyStateStore側で保持する」）。
  // MCモードでの「1,000試行を実行」押下時にのみ計算・更新される（自動再計算はしない）。
  combinedMcResult: CombinedMcResult | null;
  updateEvents: (events: CorporateLifeEvent[]) => void;
  updatePortfolioPhase: (phase: PortfolioPhaseKey, rows: CorporatePortfolioPhase['rows']) => void;
  setPortfolioPhaseManual: (
    phase: PortfolioPhaseKey,
    patch: Partial<Pick<CorporatePortfolioPhase, 'useManualMu' | 'manualMu' | 'useManualSigma' | 'manualSigma'>>,
  ) => void;
  copyCurrentToWorking: () => void;
  setRetirementSameAsWorking: (val: boolean) => void;
  setRateSameAsWorking: (val: boolean) => void;
  setSigmaSameAsWorking: (val: boolean) => void;
  setEffectiveTaxRate: (rate: number) => void;
  setCashBalance: (amount: number) => void;
  setRetirementAge: (age: number) => void;
  setIncludeInPersonalSimulator: (val: boolean) => void;
  setImportedAssets: (investedBalance: number, cashBalance: number, rows: CorporatePortfolioPhase['rows']) => void;
  setCombinedMcResult: (result: CombinedMcResult | null) => void;
  /** シミュレータープロファイルが切り替わったときに呼ぶ（simulatorStore.loadProfile()から）。
   * 指定プロファイルのCompanyStateを読み直してstateを丸ごと差し替える。 */
  loadForProfile: (profileId: number | null) => void;
}

export const useCompanyStateStore = create<CompanyStateStore>((set, get) => {
  return {
    // simulatorStore.tsとの循環importを避けるため、初期値はnull/EMPTYで作る。実際の初期
    // プロファイルの読み込みはsimulatorStore.ts側のモジュール初期化コードが明示的に
    // loadForProfile()を呼んで行う（simulatorStore.ts→companyStateStore.tsの一方向のみに保つ）。
    currentProfileId: null,
    state: EMPTY_COMPANY_STATE,
    combinedMcResult: null,

    updateEvents: (events) => {
      const { state } = get();
      set({ state: { ...state, events } });
    },

    updatePortfolioPhase: (phase, rows) => {
      const { state } = get();
      // instruction_phase2_companystate_rearchitecture.md 4節：①現在PFのみ、行のamount合計から
      // investedBalanceを自動算出する（個人側simulatorStore.tsのupdatePortfolio('current', ...)が
      // bNisa/bIdeco/bTaxを行合計から自動同期するのと同じ設計）。②③はpctのみのため対象外。
      const settingsPatch = phase === 'current'
        ? { investedBalance: rows.reduce((sum, r) => sum + (r.amount ?? 0), 0) }
        : {};
      set({
        state: {
          ...state,
          // フェーズの他フィールド（useManual/manualMu/manualSigma）を消さないよう
          // 既存フェーズをスプレッドしてからrowsだけ上書きする。
          portfolio: { ...state.portfolio, [phase]: { ...state.portfolio[phase], rows } },
          settings: { ...state.settings, ...settingsPatch },
        },
      });
    },

    setPortfolioPhaseManual: (phase, patch) => {
      const { state } = get();
      set({
        state: {
          ...state,
          portfolio: { ...state.portfolio, [phase]: { ...state.portfolio[phase], ...patch } },
        },
      });
    },

    copyCurrentToWorking: () => {
      const { state } = get();
      set({
        state: {
          ...state,
          // ％配分（rows）のみコピーする。個人側simulatorStore.tsのcopyCurrentToWorkingと同じ設計
          // （コメントで明記：「rW（μ）はgetEffectiveRW経由の算出値に一本化したため同期不要」）。
          // 手入力μ/σの設定（useManualMu/manualMu/useManualSigma/manualSigma）は既存のworking側の
          // 値を保持し、上書きしない（2026-08-21最終チェックリスト2番で修正：以前は{...current}を
          // 丸ごとコピーしており、手入力系フィールドまで意図せず混入していた）。
          portfolio: {
            ...state.portfolio,
            working: { ...state.portfolio.working, rows: state.portfolio.current.rows },
          },
        },
      });
    },

    setRetirementSameAsWorking: (val) => {
      const { state } = get();
      set({
        state: {
          ...state,
          portfolio: { ...state.portfolio, retirementSameAsWorking: val },
        },
      });
    },

    // 個人側simulatorStore.tsのsetRateSameAsWorking/setSigmaSameAsWorkingと同じ設計
    // （2026-08-21最終チェックリスト3番）。％配分の同期（retirementSameAsWorking）とは独立。
    setRateSameAsWorking: (val) => {
      const { state } = get();
      let retirementPatch: Partial<CorporatePortfolioPhase> = {};
      if (!val) {
        // OFFにした瞬間、その時点の積立期側の実効μを取崩期用の独立値としてシードし、
        // 手動モードに切り替える（値が飛んで見える同期漏れを防ぐ）。
        const workingMu = getEffectivePhaseMetrics(state.portfolio.working).mu;
        retirementPatch = { useManualMu: true, manualMu: workingMu };
      }
      set({
        state: {
          ...state,
          portfolio: {
            ...state.portfolio,
            rateSameAsWorking: val,
            retirement: { ...state.portfolio.retirement, ...retirementPatch },
          },
        },
      });
    },

    setSigmaSameAsWorking: (val) => {
      const { state } = get();
      let retirementPatch: Partial<CorporatePortfolioPhase> = {};
      if (!val) {
        const workingSigma = getEffectivePhaseMetrics(state.portfolio.working).sigma;
        retirementPatch = { useManualSigma: true, manualSigma: workingSigma };
      }
      set({
        state: {
          ...state,
          portfolio: {
            ...state.portfolio,
            sigmaSameAsWorking: val,
            retirement: { ...state.portfolio.retirement, ...retirementPatch },
          },
        },
      });
    },

    setEffectiveTaxRate: (rate) => {
      const { state } = get();
      set({ state: { ...state, settings: { ...state.settings, effectiveTaxRate: rate } } });
    },

    setCashBalance: (amount) => {
      const { state } = get();
      set({ state: { ...state, settings: { ...state.settings, cashBalance: amount } } });
    },

    setRetirementAge: (age) => {
      const { state } = get();
      set({ state: { ...state, settings: { ...state.settings, retirementAge: age } } });
    },

    setIncludeInPersonalSimulator: (val) => {
      const { state } = get();
      set({ state: { ...state, settings: { ...state.settings, includeInPersonalSimulator: val } } });
    },

    // 資産管理ツールからのインポート（3.6節）：①現在PFの資産配分・investedBalance・cashBalanceを
    // 一括上書きするワンタイム処理。自動同期は行わない。
    setImportedAssets: (investedBalance, cashBalance, rows) => {
      const { state } = get();
      set({
        state: {
          ...state,
          portfolio: { ...state.portfolio, current: { ...state.portfolio.current, rows } },
          settings: { ...state.settings, investedBalance, cashBalance },
        },
      });
    },

    setCombinedMcResult: (result) => set({ combinedMcResult: result }),

    loadForProfile: (profileId) => {
      set({
        currentProfileId: profileId,
        state: profileId === null ? EMPTY_COMPANY_STATE : getCompanyStateForProfile(profileId),
        combinedMcResult: null,
      });
    },
  };
});
