'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSimulatorStore } from '@/store/simulatorStore';
import type { ScenarioKey } from '@/store/simulatorStore';
import { decodeProfileUrl } from '@/lib/storage';
import { profileToSimParams } from '@/lib/profile';
import type { WithdrawalStrategy } from '@/lib/types';
import KpiGrid             from '@/components/simulator/KpiGrid';
import AssetChart          from '@/components/simulator/AssetChart';
import YearlyTable         from '@/components/simulator/YearlyTable';
import CashFlowChart       from '@/components/simulator/CashFlowChart';
import SimulatorForm       from '@/components/simulator/SimulatorForm';
import LifeEventTimeline   from '@/components/simulator/LifeEventTimeline';
import PortfolioPanel      from '@/components/simulator/PortfolioPanel';
import MonteCarloPanel     from '@/components/simulator/MonteCarloPanel';
import SensitivityPanel    from '@/components/simulator/SensitivityPanel';
import ImpactTable         from '@/components/simulator/ImpactTable';
import AiPanel             from '@/components/simulator/AiPanel';
import ProfileDrawer       from '@/components/simulator/ProfileDrawer';

const STRATEGY_OPTIONS: { key: WithdrawalStrategy; label: string }[] = [
  { key: 'proportional',  label: '比例取崩' },
  { key: 'cash_first',    label: '現金優先' },
  { key: 'taxable_first', label: '課税優先' },
];

const SCENARIO_OPTIONS: { key: ScenarioKey; label: string; color: string }[] = [
  { key: 'optimistic',  label: '楽観(+2%)', color: 'text-green-700' },
  { key: 'neutral',     label: '中立',       color: 'text-slate-700' },
  { key: 'pessimistic', label: '悲観(-2%)',  color: 'text-red-600'  },
];

/** useSearchParams を Suspense 境界内で使うための分離コンポーネント */
function SearchParamsLoader() {
  const searchParams = useSearchParams();
  const { loadProfile } = useSimulatorStore();
  useEffect(() => {
    const s = searchParams.get('s');
    if (s) {
      try {
        loadProfile(decodeProfileUrl(s));
        window.history.replaceState(null, '', '/simulator');
      } catch {
        // ignore malformed URL param
      }
    }
  }, []);
  return null;
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const {
    profile, snaps, analysis, mcResult, mode, cmpMode, activeStrategies, activeScenarios,
    isMcRunning, setMode, setCmpMode, setActiveStrategies, setActiveScenarios,
    runMonteCarlo,
  } = useSimulatorStore();

  const [formOpen, setFormOpen] = useState(true);

  // Default collapse on mobile
  useEffect(() => {
    if (window.innerWidth <= 640) setFormOpen(false);
  }, []);

  const strategy     = activeStrategies[0] ?? 'proportional';
  const baseSnaps    = snaps[strategy] ?? [];
  const baseAnalysis = analysis[strategy];
  const p            = profileToSimParams(profile);

  if (!mounted) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-slate-400 text-sm">読み込み中...</p>
    </div>
  );

  if (!baseAnalysis) return null;

  const toggleStrategy = (key: WithdrawalStrategy) => {
    const next = activeStrategies.includes(key)
      ? activeStrategies.filter(s => s !== key)
      : [...activeStrategies, key];
    if (next.length > 0) setActiveStrategies(next);
  };

  const toggleScenario = (key: ScenarioKey) => {
    const next = activeScenarios.includes(key)
      ? activeScenarios.filter(s => s !== key)
      : [...activeScenarios, key];
    if (next.length > 0) setActiveScenarios(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-2 pb-6">
      <Suspense fallback={null}>
        <SearchParamsLoader />
      </Suspense>
      <div className="flex justify-end mb-2">
        <ProfileDrawer />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* 左: 入力パネル — DOM first so mobile toggle reveals at top, not below results */}
        <div className="lg:w-80 lg:shrink-0">
          {/* Toggle button visible only on mobile (< 640px) */}
          <button
            className="sm:hidden w-full mb-3 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 hover:bg-slate-50"
            onClick={() => setFormOpen(o => !o)}
          >
            {formOpen ? '入力を閉じる ▲' : '入力を編集 ▼'}
          </button>
          <div className={`flex-col gap-4 ${!formOpen ? 'hidden sm:flex' : 'flex'}`}>
            <SimulatorForm />
            <PortfolioPanel />
            <LifeEventTimeline />
          </div>
        </div>

        {/* 右: 結果パネル */}
        <div className="flex flex-1 flex-col gap-4 min-w-0">

          {/* MC ↔ 固定 toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-sm">
              <button
                onClick={() => setMode('fixed')}
                className={`px-4 py-1.5 ${mode === 'fixed' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                固定モード
              </button>
              <button
                onClick={() => { if (cmpMode === 'scenario') setCmpMode('strategy'); setMode('mc'); }}
                disabled={cmpMode === 'scenario'}
                className={`px-4 py-1.5 ${mode === 'mc' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40`}
              >
                MCモード
              </button>
            </div>
            {mode === 'mc' && (
              <button
                onClick={runMonteCarlo}
                disabled={isMcRunning}
                className="rounded-lg bg-slate-700 text-white text-sm px-4 py-1.5 hover:bg-slate-600 disabled:opacity-50"
              >
                {isMcRunning ? '計算中…' : '1,000試行を実行'}
              </button>
            )}
          </div>

          {/* 比較モード */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">比較モード</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs">
                <button
                  onClick={() => setCmpMode('strategy')}
                  className={`px-3 py-1 ${cmpMode === 'strategy' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  戦略比較
                </button>
                <button
                  onClick={() => { setCmpMode('scenario'); setMode('fixed'); }}
                  className={`px-3 py-1 ${cmpMode === 'scenario' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  シナリオ比較
                </button>
              </div>
            </div>

            {cmpMode === 'strategy' && (
              <div className="flex gap-3 flex-wrap">
                {STRATEGY_OPTIONS.map(opt => (
                  <label key={opt.key} className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeStrategies.includes(opt.key)}
                      onChange={() => toggleStrategy(opt.key)}
                      className="rounded"
                    />
                    {opt.label}
                  </label>
                ))}
                <span className="text-xs text-slate-400">複数選択でグラフに重ねて表示</span>
              </div>
            )}

            {cmpMode === 'scenario' && (
              <div className="flex gap-3 flex-wrap">
                {SCENARIO_OPTIONS.map(opt => (
                  <label key={opt.key} className={`flex items-center gap-1 text-xs cursor-pointer ${opt.color}`}>
                    <input
                      type="checkbox"
                      checked={activeScenarios.includes(opt.key)}
                      onChange={() => toggleScenario(opt.key)}
                      className="rounded"
                    />
                    {opt.label}
                  </label>
                ))}
                <span className="text-xs text-slate-400">楽観+2% / 中立±0% / 悲観-2%（全口座共通Δ）</span>
              </div>
            )}
          </div>

          <KpiGrid
            analysis={baseAnalysis}
            mcResult={mcResult}
            mode={mode}
            strategy={strategy}
            retAge={p.retAge}
            idecoReceiveType={profile.params.idecoReceiveType ?? 'lump'}
            hasIdeco={profile.params.bIdeco > 0 || profile.params.cIdeco > 0}
            hasSeverance={baseAnalysis.severanceNetKPI > 0}
          />

          <AssetChart
            profile={profile}
            snaps={snaps}
            mcResult={mcResult}
            mode={mode}
            cmpMode={cmpMode}
            activeStrategies={activeStrategies}
            activeScenarios={activeScenarios}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MonteCarloPanel />
            <ImpactTable />
          </div>

          <CashFlowChart snaps={baseSnaps} />

          <SensitivityPanel />

          <YearlyTable
            snaps={baseSnaps}
            retAge={p.retAge}
            penAge={p.penAge}
            idecoStartAge={p.idecoStartAge}
            strategy={strategy}
          />

          <AiPanel />
        </div>
      </div>
    </div>
  );
}
