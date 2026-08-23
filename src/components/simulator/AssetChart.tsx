'use client';

import { useState } from 'react';
import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { YearSnap, MCResult } from '@/lib/types';
import type { ProfileV3, AssetRow } from '@/lib/profile';
import { profileToSimParams } from '@/lib/profile';
import { simulate } from '@/lib';
import type { ScenarioKey } from '@/store/simulatorStore';

interface AssetChartProps {
  profile: ProfileV3;
  snaps: Record<string, YearSnap[]>;
  mcResult?: MCResult | null;
  mode: 'fixed' | 'mc';
  cmpMode: 'strategy' | 'scenario';
  activeStrategies: string[];
  // 単一値KPIカード・MCモードのp10〜p90帯が代表として参照する1戦略。
  // 中央値の折れ線はactiveStrategies全戦略ぶん描画するが、帯はこの1つのみ。
  displayStrategy: string;
  activeScenarios: ScenarioKey[];
  // 法人資産オーバーレイ（最終版指示書3.8節）。includeInPersonalSimulatorトグルON時のみ
  // 呼び出し元(page.tsx)から渡される。OFF時はundefined/nullのままで表示に一切影響しない。
  // 固定計算モード：baseSnaps（curAge以降）と同じインデックスに揃えた法人資産の年次残高。
  corporateBalance?: number[] | null;
  // MCモード：個人+法人の合算後パーセンタイル（mc.tsのCombinedMcResult.combined.percentiles）。
  corporateMcCombined?: { p10: number[]; p50: number[]; p90: number[] } | null;
}

export const STRATEGY_LABELS: Record<string, string> = {
  proportional:  '比例取崩',
  cash_first:    '現金優先',
  taxable_first: '課税口座優先',
};

// 2番目以降の戦略ライン色（比較時）。先頭（idx===0）は常にプライマリ色(#3b82f6)。
// MonteCarloPanel等、chartの外側（色ドット表示）で使用。
export const STRATEGY_COLORS_SUB: Record<string, string> = {
  cash_first:    '#7dd3fc',
  taxable_first: '#94a3b8',
};
export const STRATEGY_PRIMARY_COLOR = '#3b82f6';

// 戦略ごとの識別スタイル（色+線種）。基準戦略(displayStrategy)がどれであっても、
// 同じ戦略は常に同じ見た目にする（学習コストを下げるため、基準切り替えで色/線種そのものは変えない）。
// 太さ・不透明度は別途「基準かどうか」で動的に切り替える（呼び出し側で isPrimary 判定）。
// color: 識別色（凡例・MC帯の色にも使う）。lineColor: 実際に線として描く色（未指定ならcolorと同じ）。
// 課税優先はMC帯の色（グレー）と中央値線の色が同化しないよう、線だけワントーン暗くする
// （mc_band_opacity_too_darkで調整。帯自体の色はcolor=#94a3b8のまま変えない）。
export const STRATEGY_STYLE: Record<string, { color: string; lineColor?: string; dash?: string }> = {
  proportional:  { color: '#3b82f6' },                                    // 実線
  cash_first:    { color: '#7dd3fc', dash: '8 4' },                       // 破線（長め）
  taxable_first: { color: '#94a3b8', lineColor: '#64748b', dash: '2 3' }, // 点線（短め）
};
function getStrategyStyle(st: string) {
  const s = STRATEGY_STYLE[st] ?? { color: '#94a3b8' };
  return { color: s.color, lineColor: s.lineColor ?? s.color, dash: s.dash };
}

// MCモードのp10〜p90帯（塗りつぶし）は基準戦略の色に連動させる。
// 帯は面積の広い背景要素なので、数値以上に濃く見える。「帯の存在は分かるが、
// その上の中央値線が主役として見える」濃さに抑える（mc_band_opacity_too_darkで調整）。
// グレー（課税優先）は彩度が低く薄く見えるため、他戦略よりfillOpacityをわずかに高めにする。
// 境界線（#93c5fd・ドット、mc_p10_p90_color_collisionで固定済み）は基準戦略に関わらず変えない。
const BAND_FILL_OPACITY: Record<string, number> = {
  proportional:  0.15,
  cash_first:    0.18,
  taxable_first: 0.2,
};
function getBandFill(st: string) {
  return { color: getStrategyStyle(st).color, opacity: BAND_FILL_OPACITY[st] ?? 0.4 };
}

const SCENARIO_CONFIG = [
  { key: 'optimistic' as ScenarioKey, label: '楽観(+2%)', color: '#3b82f6', delta: +2 },
  { key: 'neutral'    as ScenarioKey, label: '中立',       color: '#94a3b8', delta:  0 },
  { key: 'pessimistic'as ScenarioKey, label: '悲観(-2%)',  color: '#f97316', delta: -2 },
];

type TabKey = 'total' | 'breakdown';

export function formatYen(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}億`;
  return `${v}万`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFmt = (v: any) => [`${Math.round(v as number).toLocaleString()}万円`];

function spouseAgeToMain(mainCurAge: number, spCurAge: number, spTargetAge: number): number {
  return mainCurAge + (spTargetAge - spCurAge);
}

export function addFireLines(
  row: Record<string, number>,
  s: YearSnap,
) {
  row['FIREライン'] = s.baseExp * 25;
}

export function FireLines() {
  return (
    // UI仕上げ指示書2章：FIREラインは達成基準を示す参照線であり、資産推移の系列（青系）とは
    // 役割が異なるため、区別できるよう別系統の色（アンバー系）にする（2026-08-22修正、旧#16a34a緑）。
    <Line dataKey="FIREライン" stroke="#d97706" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
  );
}

/** 退職・年金の垂直ライン（同一 age はラベル結合、近接 age は縦オフセット） */
export function EventLines({ retAge, penAge, spRetAgeMain, spPenAgeMain }: {
  retAge: number; penAge: number;
  spRetAgeMain: number | null; spPenAgeMain: number | null;
}) {
  type RawMarker = { age: number; label: string; stroke: string; strokeDasharray: string };
  const raw: RawMarker[] = [
    { age: retAge, label: '退職',     stroke: '#64748b', strokeDasharray: '3 3' },
    { age: penAge, label: '年金開始', stroke: '#3b82f6', strokeDasharray: '3 3' },
  ];
  if (spRetAgeMain !== null) raw.push({ age: spRetAgeMain, label: '配偶者退職', stroke: '#94a3b8', strokeDasharray: '2 2' });
  if (spPenAgeMain !== null) raw.push({ age: spPenAgeMain, label: '配偶者年金', stroke: '#93c5fd', strokeDasharray: '2 2' });

  // 同一 age のラベルをまとめる
  const grouped = new Map<number, { labels: string[]; stroke: string; strokeDasharray: string }>();
  for (const m of raw) {
    if (!grouped.has(m.age)) {
      grouped.set(m.age, { labels: [], stroke: m.stroke, strokeDasharray: m.strokeDasharray });
    }
    grouped.get(m.age)!.labels.push(m.label);
  }

  // 近接 age（3歳以内）は奇数番目のラベルを下にオフセット
  const sortedAges = [...grouped.keys()].sort((a, b) => a - b);
  const yOffsets = new Map<number, number>();
  let lastAge = -999;
  let offsetIdx = 0;
  for (const age of sortedAges) {
    if (age - lastAge <= 3) { offsetIdx++; } else { offsetIdx = 0; }
    yOffsets.set(age, offsetIdx % 2 === 1 ? 28 : 0);
    lastAge = age;
  }

  return (
    <>
      {sortedAges.map(age => {
        const { labels, stroke, strokeDasharray } = grouped.get(age)!;
        const combinedLabel = labels.join(' / ');
        const yOff = yOffsets.get(age) ?? 0;
        return (
          <ReferenceLine
            key={age}
            x={age}
            stroke={stroke}
            strokeDasharray={strokeDasharray}
            label={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content: ({ viewBox }: any) => {
                const vx = viewBox?.x ?? 0;
                const vy = (viewBox?.y ?? 0) + 14 + yOff;
                const parts = combinedLabel.split(' / ');
                return (
                  <text x={vx + 4} fill={stroke} fontSize={10} textAnchor="start">
                    {parts.map((part, i) => (
                      <tspan key={i} x={vx + 4} dy={i === 0 ? vy - (viewBox?.y ?? 0) : 12}>
                        {part}
                      </tspan>
                    ))}
                  </text>
                );
              },
            }}
          />
        );
      })}
    </>
  );
}

export default function AssetChart({
  profile, snaps, mcResult, mode, cmpMode, activeStrategies, displayStrategy, activeScenarios,
  corporateBalance, corporateMcCombined,
}: AssetChartProps) {
  const [tab, setTab] = useState<TabKey>('total');
  const [showRealValue, setShowRealValue] = useState(false);

  const simP = profileToSimParams(profile);
  const { inflR, curAge, retAge, penAge } = simP;

  const sp = simP.spouse;
  const spEffCurAge = sp ? (sp.spCurAge || curAge) : curAge;
  const spRetAgeMain = sp ? spouseAgeToMain(curAge, spEffCurAge, sp.retAge) : null;
  const spPenAgeMain = sp ? spouseAgeToMain(curAge, spEffCurAge, sp.penAge) : null;
  const eventProps = { retAge, penAge, spRetAgeMain, spPenAgeMain };

  const baseStrategy = displayStrategy || activeStrategies[0] || 'proportional';
  const baseSnaps = snaps[baseStrategy] ?? [];

  // ── MC モード ──────────────────────────────────────────
  if (mode === 'mc' && mcResult) {
    const bandStrat = mcResult.strategies[baseStrategy as keyof typeof mcResult.strategies];
    if (bandStrat) {
      const isMulti = activeStrategies.length > 1;
      const data = baseSnaps
        .filter(s => s.age >= curAge)
        .map((s, i) => {
          const row: Record<string, number> = {
            age: s.age,
            p10: bandStrat.percentiles.p10[i] ?? 0,
            p90: bandStrat.percentiles.p90[i] ?? 0,
          };
          for (const st of activeStrategies) {
            const strat = mcResult.strategies[st as keyof typeof mcResult.strategies];
            // 複数戦略時の凡例ラベルは戦略名のみ（「中央値」は上部の注記で説明済みのため重複させない）
            const label = isMulti ? (STRATEGY_LABELS[st] ?? st) : '中央値';
            row[label] = strat?.percentiles.p50[i] ?? 0;
          }
          if (corporateMcCombined) {
            row['合算(法人含む)中央値'] = corporateMcCombined.p50[i] ?? 0;
          }
          addFireLines(row, s);
          return row;
        });
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">モンテカルロ — 総資産推移（1,000試行）</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={v => `${v}歳`} />
              <YAxis width={52} tick={{ fontSize: 11 }} tickFormatter={formatYen} />
              <Tooltip formatter={tooltipFmt} labelFormatter={l => `${l}歳`} />
              <Legend wrapperStyle={{ fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingTop: '4px' }} />
              <EventLines {...eventProps} />
              <FireLines />
              <Area dataKey="p90" legendType="plainline" fill={getBandFill(baseStrategy).color} fillOpacity={getBandFill(baseStrategy).opacity}
                stroke="#93c5fd" strokeWidth={1} strokeOpacity={0.55} strokeDasharray="1 3" name="p90" />
              <Area dataKey="p10" legendType="plainline" fill="#ffffff" fillOpacity={1}
                stroke="#93c5fd" strokeWidth={1} strokeOpacity={0.55} strokeDasharray="1 3" name="p10" />
              {activeStrategies.map(st => {
                const label = isMulti ? (STRATEGY_LABELS[st] ?? st) : '中央値';
                const isPrimary = st === baseStrategy;
                const { lineColor, dash } = getStrategyStyle(st);
                return (
                  <Line key={st} dataKey={label}
                    legendType="plainline"
                    stroke={lineColor}
                    strokeDasharray={dash}
                    strokeWidth={isPrimary ? 3 : 1.5}
                    strokeOpacity={isPrimary ? 1 : 0.65}
                    dot={false} />
                );
              })}
              {corporateMcCombined && (
                <Line dataKey="合算(法人含む)中央値" legendType="plainline"
                  // UI仕上げ指示書2章：「中央値」「合算(法人含む)中央値」はどちらも個人資産推移の
                  // 仲間の系列として同じ色系統（青系）でまとめる（2026-08-22修正、旧#059669緑）。
                  stroke="#1d4ed8" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-400 mt-2">
            {isMulti
              ? `確率的モード・中央値${activeStrategies.length}本＋${STRATEGY_LABELS[baseStrategy] ?? baseStrategy}のバンド（${mcResult.trials}試行）`
              : `確率的モード・${mcResult.trials}試行`}
          </p>
        </div>
      );
    }
  }

  // ── 口座内訳タブ ─────────────────────────────────────────
  if (tab === 'breakdown') {
    const data = baseSnaps.map(s => ({
      age: s.age,
      NISA:  s.nisa  + (s.spNisa  ?? 0),
      iDeCo: s.ideco + (s.spIdeco ?? 0),
      特定:  s.tax   + (s.spTax   ?? 0),
      現金:  s.cash  + (s.spCash  ?? 0),
    }));
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">口座内訳</h3>
          <TabButtons tab={tab} setTab={setTab} />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={v => `${v}歳`} />
            <YAxis width={52} tick={{ fontSize: 11 }} tickFormatter={formatYen} />
            <Tooltip formatter={tooltipFmt} labelFormatter={l => `${l}歳`} />
            <Legend wrapperStyle={{ fontSize: '12px', whiteSpace: 'nowrap', overflowX: 'auto', paddingTop: '4px' }} />
            <EventLines {...eventProps} />
            <Bar dataKey="NISA"  stackId="a" fill="#1D9E75" />
            <Bar dataKey="iDeCo" stackId="a" fill="#0C447C" />
            <Bar dataKey="特定"  stackId="a" fill="#378ADD" />
            <Bar dataKey="現金"  stackId="a" fill="#888780" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── シナリオ比較モード ────────────────────────────────────
  if (cmpMode === 'scenario') {
    const baseP = profileToSimParams(profile);
    const evs = profile.events;
    const applyDelta = (delta: number) => {
      const shift = (r: AssetRow[]) => r; void shift;
      return {
        ...baseP,
        acct: {
          nisa:  { ...baseP.acct.nisa,  rW: baseP.acct.nisa.rW  + delta, rR: baseP.acct.nisa.rR  + delta },
          ideco: { ...baseP.acct.ideco, rW: baseP.acct.ideco.rW + delta, rR: baseP.acct.ideco.rR + delta },
          tax:   { ...baseP.acct.tax,   rW: baseP.acct.tax.rW   + delta, rR: baseP.acct.tax.rR   + delta },
          cash:  baseP.acct.cash,
        },
      };
    };
    const scenarioSnaps: Record<ScenarioKey, YearSnap[]> = {
      optimistic:  simulate(applyDelta(+2), evs, baseStrategy as 'proportional'),
      neutral:     baseSnaps,
      pessimistic: simulate(applyDelta(-2), evs, baseStrategy as 'proportional'),
    };
    const visibleScenarios = SCENARIO_CONFIG.filter(s => activeScenarios.includes(s.key));
    const data = baseSnaps
      .filter(s => s.age >= curAge)
      .map((s, i) => {
        const row: Record<string, number> = { age: s.age };
        addFireLines(row, s);
        for (const sc of visibleScenarios) {
          row[sc.label] = scenarioSnaps[sc.key][i]?.totalAssets ?? 0;
        }
        return row;
      });
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">シナリオ比較（楽観/中立/悲観）</h3>
          <TabButtons tab={tab} setTab={setTab} disabled />
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={v => `${v}歳`} />
            <YAxis width={52} tick={{ fontSize: 11 }} tickFormatter={formatYen} />
            <Tooltip formatter={tooltipFmt} labelFormatter={l => `${l}歳`} />
            <Legend wrapperStyle={{ fontSize: '12px', whiteSpace: 'nowrap', overflowX: 'auto', paddingTop: '4px' }} />
            <EventLines {...eventProps} />
            <FireLines />
            {visibleScenarios.map((sc, idx) => (
              <Line key={sc.key} dataKey={sc.label} stroke={sc.color}
                strokeWidth={idx === 1 ? 2 : 1.5}
                strokeDasharray={idx === 1 ? undefined : '3 3'}
                dot={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── 戦略比較モード（デフォルト）────────────────────────────
  const data = baseSnaps
    .filter(s => s.age >= curAge)
    .map((s, i) => {
      const inflM = Math.pow(1 + inflR / 100, s.age - curAge);
      const row: Record<string, number> = { age: s.age };
      addFireLines(row, s);
      if (showRealValue && inflR > 0) {
        row['実質値'] = Math.round(s.totalAssets / inflM);
      }
      for (const st of activeStrategies) {
        const label = STRATEGY_LABELS[st] ?? st;
        row[label] = snaps[st]?.find(r => r.age === s.age)?.totalAssets ?? 0;
      }
      if (corporateBalance) {
        row['合算(法人含む)'] = s.totalAssets + (corporateBalance[i] ?? 0);
      }
      return row;
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className={`flex items-center justify-between ${inflR > 0 ? 'mb-1' : 'mb-3'}`}>
        <h3 className="text-sm font-semibold text-slate-700">総資産推移</h3>
        <TabButtons tab={tab} setTab={setTab} />
      </div>
      {inflR > 0 && (
        <div className="flex justify-end mb-2">
          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showRealValue}
              onChange={e => setShowRealValue(e.target.checked)}
              className="rounded"
            />
            実質値（インフレ調整）
          </label>
        </div>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="age" tick={{ fontSize: 11 }} tickFormatter={v => `${v}歳`} />
          <YAxis width={52} tick={{ fontSize: 11 }} tickFormatter={formatYen} />
          <Tooltip formatter={tooltipFmt} labelFormatter={l => `${l}歳`} />
          <Legend wrapperStyle={{ fontSize: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingTop: '4px' }} />
          <EventLines {...eventProps} />
          <FireLines />
          {showRealValue && inflR > 0 && (
            <Line dataKey="実質値" stroke="#8b5cf6"
              strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
          )}
          {activeStrategies.map(st => {
            const label = STRATEGY_LABELS[st] ?? st;
            const isPrimary = st === baseStrategy;
            const { lineColor, dash } = getStrategyStyle(st);
            return (
              <Line key={st} dataKey={label}
                legendType="plainline"
                stroke={lineColor}
                strokeDasharray={dash}
                strokeWidth={isPrimary ? 3 : 1.5}
                strokeOpacity={isPrimary ? 1 : 0.65}
                dot={false} />
            );
          })}
          {corporateBalance && (
            // UI仕上げ指示書2章：「合算(法人含む)」も個人資産推移の仲間として同じ青系にする
            // （2026-08-22修正、旧#059669緑）。
            <Line dataKey="合算(法人含む)" legendType="plainline"
              stroke="#1d4ed8" strokeWidth={2} strokeDasharray="4 2" dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TabButtons({ tab, setTab, disabled }: { tab: TabKey; setTab: (t: TabKey) => void; disabled?: boolean }) {
  return (
    <div className={`flex rounded-lg overflow-hidden border border-slate-200 text-xs ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {(['total', 'breakdown'] as TabKey[]).map(t => (
        <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 ${tab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          {t === 'total' ? '総資産' : '内訳'}
        </button>
      ))}
    </div>
  );
}
