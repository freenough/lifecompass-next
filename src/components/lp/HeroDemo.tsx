'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';
import { simulate, analyze, runMC } from '@/lib';
import type { SimParams, LifeEvent } from '@/lib/types';

const DEMO_PROFILE: SimParams = {
  curAge: 35, lifeEx: 90,
  baseInc: 750, baseExp: 360, inflR: 1,
  retAge: 60, penAge: 65, penAmt: 120,
  mcStd: 12, mcStdR: 8,
  hasIdeco: true, idecoYrs: 10,
  idecoReceiveType: 'pension', idecoReceiveYears: 15, idecoStartAge: 60,
  sevYrs: 12,
  acct: {
    nisa:  { bal: 400, con: 120, toAge: 60, rW: 5, rR: 3.5 },
    ideco: { bal: 300, con: 27.6, toAge: 60, rW: 5, rR: 3.5 },
    tax:   { bal: 500, con: 0,    toAge: 60, rW: 5, rR: 3.5, costBasis: 500 },
    cash:  { bal: 300 },
  },
  spouse: null,
};

const DEMO_EVENTS: LifeEvent[] = [
  { category: 'expense', subtype: 'base_change', age: 60, amount: 300, name: '', years: 0 },
];

function useCountUp(target: number | null, duration = 1200, decimals = 0): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === null) return;
    const start = Date.now();
    let frame: number;
    const step = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(parseFloat((target * eased).toFixed(decimals)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, decimals]);
  return val;
}

interface ChartRow {
  age: number;
  p10: number;
  band: number;
  p50: number;
}

const KPI_LABELS = ['FIRE達成年齢', '資産寿命', 'MC破綻確率'];

export default function HeroDemo() {
  const [fireAge, setFireAge] = useState<number | null>(null);
  const [assetLifeNull, setAssetLifeNull] = useState(false);
  const [bankruptcyRate, setBankruptcyRate] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [visible, setVisible] = useState(false);

  // フェードイン用：マウント100ms後にtrue
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const snaps = simulate(DEMO_PROFILE, DEMO_EVENTS, 'cash_first');
    const a = analyze(snaps, DEMO_PROFILE);
    setFireAge(a.fA);
    setAssetLifeNull(a.assetLife === null);

    const mc = runMC(DEMO_PROFILE, DEMO_EVENTS, ['cash_first'], 1000);
    const rate = mc.strategies.cash_first.bankruptcyRate;
    setBankruptcyRate(Math.round(rate * 10) / 10);

    const pct = mc.strategies.cash_first.percentiles;
    const rows: ChartRow[] = pct.p50.map((p50val, i) => {
      const p10 = Math.max(0, Math.round(pct.p10[i]));
      const p90 = Math.max(0, Math.round(pct.p90[i]));
      return {
        age: DEMO_PROFILE.curAge + i,
        p10,
        band: Math.max(0, p90 - p10),
        p50: Math.max(0, Math.round(p50val)),
      };
    });
    setChartData(rows);
  }, []);

  const fireAgeVal = useCountUp(fireAge, 1200, 0);
  const rateVal    = useCountUp(bankruptcyRate, 1500, 1);

  const kpiValues = [
    fireAge === null      ? '—' : `${Math.round(fireAgeVal)}歳`,
    bankruptcyRate === null ? '—' : assetLifeNull ? '枯渇なし' : `${DEMO_PROFILE.lifeEx}歳`,
    bankruptcyRate === null ? '—' : `${rateVal.toFixed(1)}%`,
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full">

      {/* KPI ブロック — ダークネイビー・フェードイン */}
      <div className="grid grid-cols-3 gap-2">
        {KPI_LABELS.map((label, i) => (
          <div
            key={label}
            className="bg-slate-800 rounded-lg p-2 sm:p-4 text-center"
            style={{
              opacity:   visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.4s ease ${i * 0.15}s, transform 0.4s ease ${i * 0.15}s`,
            }}
          >
            <div className="text-[9px] sm:text-xs text-white/70 mb-1 whitespace-nowrap">{label}</div>
            <div className={`font-bold text-white whitespace-nowrap ${kpiValues[i] === '枯渇なし' ? 'text-base sm:text-2xl' : 'text-xl sm:text-3xl'}`}>
              {kpiValues[i]}
            </div>
          </div>
        ))}
      </div>

      {/* MC ファンチャート — 左から描画アニメーション */}
      <div className="mt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
              <XAxis
                dataKey="age"
                type="number"
                domain={[35, 90]}
                ticks={[35, 45, 55, 65, 75, 85, 90]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis hide />
              {/* p10 までを白塗り（バンドのベース） */}
              <Area
                type="monotone"
                dataKey="p10"
                stroke="none"
                fill="white"
                fillOpacity={1}
                stackId="fan"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              {/* p10〜p90 バンド（薄青） */}
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="#bfdbfe"
                fillOpacity={0.7}
                stackId="fan"
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
              {/* p50 中央値ライン（青） */}
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 190 }} className="flex items-center justify-center text-slate-300 text-sm">
            計算中…
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-left mt-2">
        ※ サンプルデータによるシミュレーション結果
      </p>
    </div>
  );
}
