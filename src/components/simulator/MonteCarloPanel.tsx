'use client';

import { useSimulatorStore } from '@/store/simulatorStore';

export default function MonteCarloPanel() {
  const { mcResult, mode, activeStrategies } = useSimulatorStore();
  const strategy = activeStrategies[0] ?? 'proportional';
  const stResult = mcResult?.strategies[strategy as keyof typeof mcResult.strategies];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">モンテカルロ分析</h3>

      {!stResult && mode !== 'mc' && (
        <p className="text-xs text-slate-400">MCモードで「1,000試行を実行」を押してください</p>
      )}
      {!stResult && mode === 'mc' && (
        <p className="text-xs text-slate-400">MCモードが選択されています。上の実行ボタンを押してください</p>
      )}

      {stResult && (
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
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  const fmt = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}億円` : `${Math.round(v).toLocaleString()}万円`;
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{fmt(value)}</span>
    </div>
  );
}
