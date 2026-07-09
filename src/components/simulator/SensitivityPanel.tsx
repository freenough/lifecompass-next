'use client';

import { useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { useSimulatorStore } from '@/store/simulatorStore';
import { profileToSimParams } from '@/lib/profile';
import { simulate } from '@/lib';
import type { YearSnap } from '@/lib/types';

interface Deltas {
  dW: number;
  dR: number;
  dI: number;
  dA: number;
  dAge: number;
}

const ZERO: Deltas = { dW: 0, dR: 0, dI: 0, dA: 0, dAge: 0 };

function fmtDelta(v: number, unit: string): string {
  if (v === 0) return `±0${unit}`;
  return v > 0 ? `+${v}${unit}` : `${v}${unit}`;
}

function fmtYen(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}億`;
  return `${Math.round(v)}万`;
}

// 不足額表示用: 0のときマイナス符号なし
function fmtShort(v: number): string {
  if (v === 0) return '0万';
  return `−${fmtYen(v)}`;
}

// 旧HTML版と同じfindFireAge。
// refSnaps=null → 自身のbaseExp×25で判定（ベースライン用）
// refSnaps=baseSnaps → ベースラインのFIREラインを閾値にして判定（変化後用）
function findFireAge(snaps: YearSnap[], refSnaps: YearSnap[] | null): number | null {
  for (let i = 0; i < snaps.length; i++) {
    const s = snaps[i];
    const ref = refSnaps ? refSnaps.find(r => r.age === s.age) : s;
    if (!ref) continue;
    const threshold = ref.baseExp * 25;
    if (s.totalAssets > 0 && s.totalAssets >= threshold) {
      const fromHere = snaps.slice(i);
      if (fromHere.every(r => {
        const rRef = refSnaps ? refSnaps.find(b => b.age === r.age) : r;
        return rRef != null && r.totalAssets > 0 && r.totalAssets >= rRef.baseExp * 25;
      })) return s.age;
    }
  }
  return null;
}

// SVG凡例スウォッチ
function LegendSwatch({ stroke, dasharray, width = 2 }: { stroke: string; dasharray?: string; width?: number }) {
  return (
    <svg width="18" height="8" className="shrink-0">
      <line x1="0" y1="4" x2="18" y2="4" stroke={stroke} strokeWidth={width} strokeDasharray={dasharray} />
    </svg>
  );
}

export default function SensitivityPanel() {
  const { profile, displayStrategy } = useSimulatorStore();
  const strategy = displayStrategy ?? 'proportional';
  const [deltas, setDeltas] = useState<Deltas>(ZERO);
  const [open, setOpen] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isZero = Object.values(deltas).every(v => v === 0);

  const applyDeltas = useCallback((d: Deltas) => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setDeltas(d), 200);
  }, []);

  const baseP = profileToSimParams(profile);
  const baseEvs = profile.events;

  const inflClamped = baseP.inflR + deltas.dI < 0;

  const newCurAge = Math.max(20, Math.min(baseP.lifeEx - 1, baseP.curAge + deltas.dAge));
  const altP = {
    ...baseP,
    curAge: newCurAge,
    inflR: Math.max(0, baseP.inflR + deltas.dI),
    retAge: Math.max(newCurAge + 1, Math.min(baseP.lifeEx - 1, baseP.retAge + deltas.dA)),
    acct: {
      nisa:  { ...baseP.acct.nisa,  rW: baseP.acct.nisa.rW  + deltas.dW, rR: baseP.acct.nisa.rR  + deltas.dR },
      ideco: { ...baseP.acct.ideco, rW: baseP.acct.ideco.rW + deltas.dW, rR: baseP.acct.ideco.rR + deltas.dR },
      tax:   { ...baseP.acct.tax,   rW: baseP.acct.tax.rW   + deltas.dW, rR: baseP.acct.tax.rR   + deltas.dR },
      cash:  baseP.acct.cash,
    },
  };

  const baseSnaps = simulate(baseP, baseEvs, strategy as 'proportional');
  const altSnaps  = simulate(altP,  baseEvs, strategy as 'proportional');

  const baseFire = findFireAge(baseSnaps, null);
  const sensFire = findFireAge(altSnaps, baseSnaps);

  // グラフデータ
  const chartData = baseSnaps.map(s => ({
    age: s.age,
    ベースライン: s.totalAssets,
    変化後: altSnaps.find(r => r.age === s.age)?.totalAssets ?? null,
    FIREライン: s.baseExp != null ? Math.round(s.baseExp * 25) : null,
  }));

  // 最終資産差
  const lastBase = baseSnaps.at(-1)?.totalAssets ?? 0;
  const lastAlt  = altSnaps.at(-1)?.totalAssets ?? 0;
  const lastDiff = lastAlt - lastBase;
  const diffStr   = lastDiff === 0 ? '±0万' : (lastDiff > 0 ? '+' : '') + fmtYen(lastDiff);
  const diffColor = lastDiff > 0 ? 'text-blue-600' : lastDiff < 0 ? 'text-red-600' : 'text-slate-400';

  // 両者未達の退職時差額
  const retAgeEff = altP.retAge;
  const baseAtRet = baseSnaps.find(s => s.age === retAgeEff);
  const altAtRet  = altSnaps.find(s => s.age === retAgeEff);
  const baseFireLineAtRet = baseAtRet ? baseAtRet.baseExp * 25 : null;
  const baseGap = baseAtRet && baseFireLineAtRet != null ? baseAtRet.totalAssets - baseFireLineAtRet : null;
  const sensGap = altAtRet  && baseFireLineAtRet != null ? altAtRet.totalAssets  - baseFireLineAtRet : null;

  // KPI組み立て
  let kpiLabel    = 'FIRE達成年齢';
  let kpiBase     = '—';
  let kpiChanged  = '—';
  let kpiDelta    = '—';
  let kpiBaseColor    = 'text-slate-700';
  let kpiChangedColor = 'text-slate-700';
  let kpiDeltaColor   = 'text-slate-500';

  if (baseFire && sensFire) {
    const dy = baseFire - sensFire;
    kpiBase    = `${baseFire}歳`;
    kpiChanged = `${sensFire}歳`;
    kpiChangedColor = sensFire <= baseFire ? 'text-green-700' : 'text-red-600';
    if (dy > 0)      { kpiDelta = `▲${dy}年早`;           kpiDeltaColor = 'text-green-700'; }
    else if (dy < 0) { kpiDelta = `+${Math.abs(dy)}年遅`; kpiDeltaColor = 'text-red-600'; }
    else             { kpiDelta = '変化なし'; }
  } else if (!baseFire && sensFire) {
    kpiBase         = '未達';
    kpiBaseColor    = 'text-slate-400';
    kpiChanged      = `${sensFire}歳`;
    kpiChangedColor = 'text-green-700';
    kpiDelta        = '初FIRE達成';
    kpiDeltaColor   = 'text-green-700';
  } else {
    kpiBase      = '未達';
    kpiBaseColor = 'text-slate-400';
    kpiChanged      = '未達';
    kpiChangedColor = 'text-slate-400';
    if (baseGap !== null && sensGap !== null) {
      const rawBaseShort = -baseGap;
      const rawSensShort = -sensGap;
      const imp = rawBaseShort - rawSensShort;
      kpiBase    = `未達 ${fmtShort(Math.max(0, rawBaseShort))}`;
      kpiChanged = `未達 ${fmtShort(Math.max(0, rawSensShort))}`;
      kpiDelta   = (imp >= 0 ? '改善 +' : '悪化 −') + fmtYen(Math.abs(imp));
      kpiDeltaColor = imp >= 0 ? 'text-green-700' : 'text-red-600';
    }
  }

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
        type="range" min={min} max={max} step={step} value={val}
        onChange={e => {
          const next = { ...deltas, [id]: parseFloat(e.target.value) };
          setDeltas(next);
          applyDeltas(next);
        }}
        className="w-full accent-slate-700"
      />
    </div>
  );

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

          {/* リセットボタン */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => { setDeltas(ZERO); applyDeltas(ZERO); }}
              className="text-[10px] border border-slate-300 rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-50 whitespace-nowrap"
            >
              ↺ リセット
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-4">
            <SliderRow id="dW"   label="利回りΔ（積立期・全口座）" val={deltas.dW}   min={-5}  max={5}  step={0.5} unit="%" />
            <SliderRow id="dR"   label="利回りΔ（取崩期・全口座）" val={deltas.dR}   min={-5}  max={5}  step={0.5} unit="%" />
            <SliderRow id="dI"   label="インフレ率Δ"               val={deltas.dI}   min={-2}  max={3}  step={0.5} unit="%" />
            {inflClamped && (
              <p className="text-[10px] text-slate-400 -mt-2 leading-relaxed">
                適用インフレ率：0%（0%未満にはなりません）
              </p>
            )}
            <SliderRow id="dA"   label="退職年齢Δ"                 val={deltas.dA}   min={-10} max={5}  step={1}   unit="年" />
            <SliderRow id="dAge" label="開始を遅らせた場合"         val={deltas.dAge} min={0}   max={10} step={1}   unit="年" />
          </div>

          {/* FIRE年齢KPI */}
          <div className="rounded-lg bg-slate-50 px-3 py-2 mb-3">
            <p className="text-[10px] font-semibold text-slate-500 mb-1">{kpiLabel}</p>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <span className="text-slate-400">ベースライン</span>
              <span className="text-slate-400">変化後</span>
              <span className="text-slate-400">差分</span>
              <span className={`font-medium ${kpiBaseColor}`}>{kpiBase}</span>
              <span className={`font-medium ${kpiChangedColor}`}>{kpiChanged}</span>
              <span className={`font-medium ${kpiDeltaColor}`}>{kpiDelta}</span>
            </div>
          </div>

          {/* 凡例・最終資産差 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <LegendSwatch stroke="rgba(100,100,100,0.5)" dasharray="4 3" width={1.5} />
              FIREライン
            </span>
            <span className="flex items-center gap-1">
              <LegendSwatch stroke="#93c5fd" dasharray="5 4" width={1.5} />
              ベースライン
            </span>
            <span className="flex items-center gap-1">
              <LegendSwatch stroke="#dc2626" width={2} />
              変化後
            </span>
            {!isZero && (
              <span className={`ml-auto font-medium ${diffColor}`}>
                最終資産差: {diffStr}
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="age" tick={{ fontSize: 10 }} tickFormatter={v => `${v}歳`} />
              <YAxis width={48} tick={{ fontSize: 10 }} tickFormatter={fmtYen} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) => [`${Math.round(v as number).toLocaleString()}万円`, name]}
                labelFormatter={l => `${l}歳`}
              />
              {/* 退職年齢縦棒（dAスライダーで移動） */}
              <ReferenceLine
                x={altP.retAge}
                stroke="#64748b"
                strokeDasharray="3 3"
                label={{ value: '退職', fill: '#64748b', fontSize: 9, position: 'insideTopRight' }}
              />
              <Line dataKey="FIREライン"   stroke="rgba(100,100,100,0.4)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line dataKey="ベースライン" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line dataKey="変化後" stroke={isZero ? '#93c5fd' : '#dc2626'} strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
