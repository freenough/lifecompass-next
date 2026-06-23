'use client';

import { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useSimulatorStore } from '@/store/simulatorStore';
import { profileToSimParams } from '@/lib/profile';
import { simulate, analyze } from '@/lib';

interface Deltas {
  dW: number;   // 利回りΔ積立期
  dR: number;   // 利回りΔ取崩期
  dI: number;   // インフレ率Δ
  dA: number;   // 退職年齢Δ
  dAge: number; // 開始を遅らせた場合
}

const ZERO: Deltas = { dW: 0, dR: 0, dI: 0, dA: 0, dAge: 0 };

function fmtDelta(v: number, unit: string): string {
  if (v === 0) return `±0${unit}`;
  return v > 0 ? `+${v}${unit}` : `${v}${unit}`;
}

function fmtYen(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}億`;
  return `${v}万`;
}

export default function SensitivityPanel() {
  const { profile, activeStrategies } = useSimulatorStore();
  const strategy = activeStrategies[0] ?? 'proportional';
  const [deltas, setDeltas] = useState<Deltas>(ZERO);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isZero = Object.values(deltas).every(v => v === 0);

  const applyDeltas = useCallback((d: Deltas) => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDeltas(d), 200);
  }, []);

  const baseP = profileToSimParams(profile);
  const baseEvs = profile.events;

  const altP = {
    ...baseP,
    inflR:  baseP.inflR  + deltas.dI,
    retAge: Math.max(baseP.curAge + 1 + deltas.dAge, baseP.retAge + deltas.dA),
    curAge: baseP.curAge + deltas.dAge,
    acct: {
      nisa:  { ...baseP.acct.nisa,  rW: baseP.acct.nisa.rW  + deltas.dW, rR: baseP.acct.nisa.rR  + deltas.dR },
      ideco: { ...baseP.acct.ideco, rW: baseP.acct.ideco.rW + deltas.dW, rR: baseP.acct.ideco.rR + deltas.dR },
      tax:   { ...baseP.acct.tax,   rW: baseP.acct.tax.rW   + deltas.dW, rR: baseP.acct.tax.rR   + deltas.dR },
      cash:  baseP.acct.cash,
    },
  };

  const baseSnaps = simulate(baseP, baseEvs, strategy as 'proportional');
  const altSnaps  = simulate(altP,  baseEvs, strategy as 'proportional');
  const baseA     = analyze(baseSnaps, baseP);
  const altA      = analyze(altSnaps,  altP);
  const fireAmount = profile.params.baseExp * 25;

  const chartData = baseSnaps.map((s, i) => ({
    age: s.age,
    ベースライン: s.totalAssets,
    変化後: altSnaps[i]?.totalAssets ?? 0,
  }));

  const fireBase    = baseA.fA != null ? `${baseA.fA}歳` : '—';
  const fireChanged = altA.fA  != null ? `${altA.fA}歳`  : '—';
  const fireDelta   = baseA.fA != null && altA.fA != null
    ? altA.fA - baseA.fA
    : null;
  const deltaStr = fireDelta == null ? '—' : fireDelta === 0 ? '±0年' : fireDelta > 0 ? `+${fireDelta}年` : `${fireDelta}年`;
  const deltaColor = fireDelta == null ? '' : fireDelta < 0 ? 'text-green-700' : fireDelta > 0 ? 'text-red-600' : '';

  const SliderRow = ({ id, label, val, min, max, step, unit }: {
    id: keyof Deltas; label: string; val: number; min: number; max: number; step: number; unit: string;
  }) => (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className={`font-medium ${val === 0 ? 'text-slate-400' : val > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
          {fmtDelta(val, unit)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={e => {
          const next = { ...deltas, [id]: parseFloat(e.target.value) };
          setDeltas(next);
          applyDeltas(next);
        }}
        className="w-full accent-slate-700"
      />
    </div>
  );

  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>感度分析</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
      <div className="px-4 pb-4">
      <div className="flex justify-end mb-3">
        <div className="flex items-center gap-2">
          {!isZero && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">分析中</span>
          )}
          <button
            onClick={() => { setDeltas(ZERO); applyDeltas(ZERO); }}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            リセット
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <SliderRow id="dW"   label="利回りΔ（積立期・全口座）" val={deltas.dW}   min={-5}  max={5}  step={0.5} unit="%" />
        <SliderRow id="dR"   label="利回りΔ（取崩期・全口座）" val={deltas.dR}   min={-5}  max={5}  step={0.5} unit="%" />
        <SliderRow id="dI"   label="インフレ率Δ"               val={deltas.dI}   min={-2}  max={3}  step={0.5} unit="%" />
        <SliderRow id="dA"   label="退職年齢Δ"                 val={deltas.dA}   min={-10} max={5}  step={1}   unit="年" />
        <SliderRow id="dAge" label="開始を遅らせた場合"         val={deltas.dAge} min={0}   max={10} step={1}   unit="年" />
      </div>

      {/* FIRE年齢比較 */}
      <div className="rounded-lg bg-slate-50 px-3 py-2 mb-3">
        <p className="text-[10px] font-semibold text-slate-500 mb-1">FIRE達成年齢（安心）</p>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <span className="text-slate-400">ベースライン</span>
          <span className="text-slate-400">変化後</span>
          <span className="text-slate-400">差分</span>
          <span className="font-medium text-slate-700">{fireBase}</span>
          <span className="font-medium text-slate-700">{fireChanged}</span>
          <span className={`font-medium ${deltaColor}`}>{deltaStr}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 10 }} tickFormatter={v => `${v}歳`} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtYen} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [`${Math.round(v as number).toLocaleString()}万円`]}
            labelFormatter={l => `${l}歳`}
          />
          <ReferenceLine y={fireAmount} stroke="#16a34a" strokeDasharray="4 4" />
          <Line dataKey="ベースライン" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
          <Line dataKey="変化後" stroke={isZero ? '#93c5fd' : '#dc2626'} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
