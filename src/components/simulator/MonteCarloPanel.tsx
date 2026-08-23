'use client';

import { useSimulatorStore } from '@/store/simulatorStore';
import { STRATEGY_LABELS, STRATEGY_COLORS_SUB, STRATEGY_PRIMARY_COLOR } from '@/components/simulator/AssetChart';
import { useDisplayMcResult } from '@/lib/hojinCompanyState/useDisplayMcResult';
import { useCompanyStateStore } from '@/lib/hojinCompanyState/companyStateStore';
import type { WithdrawalStrategy } from '@/lib/types';
import type { CombinedMcStrategyResult } from '@/lib/hojinCompanyState/mc';
import CorporateCombinedBadge from '@/components/hojinCompanyState/CorporateCombinedBadge';

function fmt(v: number) {
  return v >= 10000 ? `${(v / 10000).toFixed(1)}億円` : `${Math.round(v).toLocaleString()}万円`;
}

// 「枯渇した{n}試行」のnは、bankruptcyRate(%)とtrials(総試行数)から逆算する
// （montecarlo.ts側にbankruptCountそのものを返す口はないため）。
function depletionStr(mean: number | null, min: number | null, rate: number, trials: number): string {
  if (rate <= 0) return '全試行で資産維持';
  const n = Math.round((rate / 100) * trials);
  const meanStr = mean != null ? `${Math.round(mean)}歳` : '—';
  const minStr = min != null ? `${Math.round(min)}歳` : '—';
  return `枯渇した${n}試行：平均${meanStr}・最短${minStr}`;
}

// 法人合算行（1戦略ぶん）。単一戦略ブロック・複数戦略ブロックの両方から共有する。
// UI仕上げ指示書3章：共通のCorporateCombinedBadgeコンポーネントを使う（旧・独自スタイル廃止）。
// 最終監査3.3：個人単独側（破綻確率・p10・p50・p90の4指標）と情報量を揃える
// （従来は破綻確率・中央値の2指標のみで、p10/p90が欠けていた）。
function CorporateCombinedRow({ combined }: { combined: CombinedMcStrategyResult }) {
  const p10 = combined.percentiles.p10.at(-1) ?? 0;
  const p50 = combined.percentiles.p50.at(-1) ?? 0;
  const p90 = combined.percentiles.p90.at(-1) ?? 0;
  return (
    <CorporateCombinedBadge className="mt-1">
      法人合算：破綻確率{combined.bankruptcyRate.toFixed(1)}%・p10 {fmt(p10)}・中央値{fmt(p50)}・p90 {fmt(p90)}
    </CorporateCombinedBadge>
  );
}

export default function MonteCarloPanel() {
  const { mode, activeStrategies, displayStrategy } = useSimulatorStore();
  const rawMcResult = useSimulatorStore(s => s.mcResult);
  const mcResult = useDisplayMcResult(rawMcResult);
  const includeInPersonalSimulator = useCompanyStateStore(s => s.state.settings.includeInPersonalSimulator);
  const combinedMcResult = useCompanyStateStore(s => s.combinedMcResult);
  const showCorporate = includeInPersonalSimulator && !!combinedMcResult;

  const isMulti = activeStrategies.length > 1;
  // 単一戦略選択時はdisplayStrategy===activeStrategies[0]のため、従来と同じ値になる
  const stResult = mcResult?.strategies[displayStrategy as keyof typeof mcResult.strategies];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">モンテカルロ分析</h3>

      {!mcResult && mode !== 'mc' && (
        <p className="text-xs text-slate-400">MCモードで「1,000試行を実行」を押してください</p>
      )}
      {!mcResult && mode === 'mc' && (
        <p className="text-xs text-slate-400">MCモードが選択されています。上の実行ボタンを押してください</p>
      )}

      {mcResult && !isMulti && stResult && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex justify-between text-xs border-b border-slate-100 pb-2">
            <span className="text-slate-500">破綻確率（90歳時点）</span>
            <span className={`font-bold ${stResult.bankruptcyRate < 10 ? 'text-green-700' : stResult.bankruptcyRate < 25 ? 'text-yellow-700' : 'text-red-700'}`}>
              {stResult.bankruptcyRate.toFixed(1)}%
            </span>
          </div>
          <Row label="p10（悲観）" value={stResult.percentiles.p10[stResult.percentiles.p10.length - 1]} />
          <Row label="中央値（p50）" value={stResult.percentiles.p50[stResult.percentiles.p50.length - 1]} />
          <Row label="p90（楽観）" value={stResult.percentiles.p90[stResult.percentiles.p90.length - 1]} />
          {stResult.depletionMean != null && (
            <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
              <span className="text-slate-500">枯渇時・平均枯渇年齢</span>
              <span className="font-medium text-red-600">{stResult.depletionMean}歳</span>
            </div>
          )}
          {stResult.depletionMin != null && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">最短枯渇年齢</span>
              <span className="font-medium text-red-600">{stResult.depletionMin}歳</span>
            </div>
          )}
          {showCorporate && <CorporateCombinedRow combined={combinedMcResult!.combined[displayStrategy]} />}
        </div>
      )}

      {/* 複数戦略選択時：1戦略=1ブロックの積み上げ表示（テーブルにしない。狭幅で列がガタつくのを避けるため） */}
      {mcResult && isMulti && (
        <div className="mt-4 flex flex-col gap-3">
          {activeStrategies.map((st, idx) => {
            const strat = mcResult.strategies[st as keyof typeof mcResult.strategies];
            if (!strat) return null;
            const color = idx === 0 ? STRATEGY_PRIMARY_COLOR : (STRATEGY_COLORS_SUB[st] ?? '#94a3b8');
            const rate = strat.bankruptcyRate;
            const p10 = strat.percentiles.p10[strat.percentiles.p10.length - 1];
            const p50 = strat.percentiles.p50[strat.percentiles.p50.length - 1];
            const p90 = strat.percentiles.p90[strat.percentiles.p90.length - 1];
            return (
              <div key={st} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[13px] text-slate-600">{STRATEGY_LABELS[st] ?? st}</span>
                  <span
                    className={`text-base font-bold ml-auto ${rate < 10 ? 'text-green-700' : rate < 25 ? 'text-yellow-700' : 'text-red-700'}`}
                  >
                    {rate.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {depletionStr(strat.depletionMean, strat.depletionMin, rate, mcResult.trials)}・
                  p10 {fmt(p10)}・中央値 {fmt(p50)}・p90 {fmt(p90)}
                </p>
                {showCorporate && <CorporateCombinedRow combined={combinedMcResult!.combined[st as WithdrawalStrategy]} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{fmt(value)}</span>
    </div>
  );
}
