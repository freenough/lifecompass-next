'use client';

import { useState } from 'react';
import type { AnalysisResult, MCResult } from '@/lib/types';

interface KpiGridProps {
  analysis: AnalysisResult;
  mcResult?: MCResult | null;
  mode: 'fixed' | 'mc';
  strategy: string;
  retAge: number;
  idecoReceiveType?: 'lump' | 'pension';
  hasIdeco: boolean;
  hasSeverance: boolean;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: 'good' | 'warn' | 'danger' | 'neutral';
  footer?: React.ReactNode;
}

function KpiCard({ label, value, sub, variant = 'neutral', footer }: KpiCardProps) {
  const bg: Record<string, string> = {
    good:    'bg-green-50 border-green-200',
    warn:    'bg-yellow-50 border-yellow-200',
    danger:  'bg-red-50 border-red-200',
    neutral: 'bg-slate-50 border-slate-200',
  };
  const text: Record<string, string> = {
    good:    'text-green-700',
    warn:    'text-yellow-700',
    danger:  'text-red-700',
    neutral: 'text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[variant]}`}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold leading-tight ${text[variant]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {footer}
    </div>
  );
}

function fmt(v: number | null | undefined, suffix = '万円'): string {
  if (v == null) return '—';
  if (v >= 10000) return `${(v / 10000).toFixed(1)}億円`;
  return `${Math.round(v).toLocaleString()}${suffix}`;
}

function ageStr(v: number | null | undefined): string {
  return v == null ? '—' : `${v}歳`;
}

export default function KpiGrid({
  analysis: a, mcResult, mode, strategy, retAge, idecoReceiveType,
  hasIdeco,
}: KpiGridProps) {
  const [tier4Open, setTier4Open] = useState(false);

  const mcStrat = mcResult?.strategies[strategy as keyof typeof mcResult.strategies];
  const mcStr   = mcStrat != null ? `${mcStrat.bankruptcyRate.toFixed(1)}%` : null;
  const mcRate  = mcStrat?.bankruptcyRate ?? 100;
  const mcVariant = mcRate < 10 ? 'good' : mcRate < 25 ? 'warn' : 'danger';

  const lastVariant = a.last === 0 ? 'danger' : a.last > 10000 ? 'good' : 'neutral';

  const wr = a.withdrawalRate;
  const wrStr = wr != null ? `${wr.toFixed(1)}%` : '—';
  const wrVariant: 'good' | 'warn' | 'danger' | 'neutral' =
    wr == null ? 'neutral' : wr <= 4 ? 'good' : wr <= 6 ? 'warn' : 'danger';

  const idecoSub = idecoReceiveType === 'lump' && a.idecoLumpTax > 0
    ? `一時金税 ${Math.round(a.idecoLumpTax).toLocaleString()}万円`
    : undefined;

  const showIdecoTier3 = hasIdeco;
  const tier3Cols = showIdecoTier3 ? 'grid-cols-2' : 'grid-cols-1';

  // Tier4: iDeCo一時金受取のとき展開可能
  const tier4Expandable = hasIdeco && idecoReceiveType === 'lump';

  void mode; // mode prop retained for future use

  return (
    <div className="flex flex-col gap-3">
      {/* Tier1: 3枚・常時 — 資産寿命 / FIRE達成 / MC破綻確率 */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="資産寿命"
          value={a.dA != null ? `退職後 ${a.dA - retAge}年` : '枯渇なし'}
          sub={a.dA != null ? `${a.dA}歳で枯渇` : undefined}
          variant={a.dA != null ? 'danger' : 'good'}
        />
        <KpiCard
          label="FIRE達成（安心）"
          value={ageStr(a.fA)}
          sub="資産 ≥ 支出×25 を維持"
          variant={a.fA != null ? 'good' : 'neutral'}
        />
        <KpiCard
          label="MC 破綻確率"
          value={mcStr ?? '—'}
          sub={mcStr ? '1,000試行・90歳時点' : 'MCモードで実行'}
          variant={mcStr ? mcVariant : 'neutral'}
        />
      </div>

      {/* Tier2: 3枚・常時 — 最終資産 / 初年度取崩率 / 収支転換点 */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="最終資産（終端）"
          value={fmt(a.last)}
          sub={`${retAge}歳退職`}
          variant={lastVariant}
        />
        <KpiCard
          label="初年度取崩率"
          value={wrStr}
          sub="退職直後の実効引出率"
          variant={wrVariant}
        />
        <KpiCard
          label="収支転換点"
          value={ageStr(a.breakEven)}
          sub="CF がマイナスに転じる年齢"
        />
      </div>

      {/* Tier3: 資産ピーク（常時）/ iDeCo受取（hasIdecoのとき） */}
      <div className={`grid gap-3 ${tier3Cols}`}>
        <KpiCard
          label="資産ピーク"
          value={fmt(a.pV)}
          sub={ageStr(a.pA)}
        />
        {showIdecoTier3 && (
          <KpiCard
            label="iDeCo受取（手取り）"
            value={fmt(
              idecoReceiveType === 'lump'
                ? a.idecoLumpNet
                : a.idecoTotalNetWithdrawal
            )}
            sub={idecoSub}
            footer={
              tier4Expandable ? (
                <button
                  onClick={() => setTier4Open(o => !o)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  {tier4Open ? '▲ 閉じる' : '▼ 詳細'}
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Tier4: iDeCo詳細（一時金受取・展開時のみ） */}
      {tier4Expandable && tier4Open && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            label="iDeCo（手取り）"
            value={fmt(a.idecoLumpNet)}
          />
          <KpiCard
            label="退職金（手取り）"
            value={fmt(a.severanceNetKPI)}
          />
          <KpiCard
            label="退職所得税（合計）"
            value={fmt(a.idecoLumpTax)}
            sub="iDeCo＋退職金の合算課税"
          />
        </div>
      )}
    </div>
  );
}
