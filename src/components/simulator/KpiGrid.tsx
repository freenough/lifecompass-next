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
  tooltip?: string;
}

function KpiCard({ label, value, sub, variant = 'neutral', footer, tooltip }: KpiCardProps) {
  const [showTip, setShowTip] = useState(false);

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
    <div className={`rounded-xl border p-4 relative ${bg[variant]}`}>
      {tooltip && (
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setShowTip(v => !v)}
            className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold leading-none flex items-center justify-center hover:bg-slate-300"
            aria-label="説明を表示"
          >
            ?
          </button>
          {showTip && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowTip(false)} />
              <div className="absolute right-0 top-6 z-20 w-52 rounded-lg bg-slate-800 text-white text-xs p-3 shadow-xl leading-relaxed">
                <div className="absolute -top-1.5 right-1 w-3 h-3 bg-slate-800 rotate-45" />
                {tooltip}
              </div>
            </>
          )}
        </div>
      )}
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

function SpouseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs text-slate-500">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function DetailBreakdown({ selfValue, spValue, showSpouse }: { selfValue: string; spValue: string; showSpouse: boolean }) {
  return (
    <div className="mt-2 border-t border-slate-200 pt-2 space-y-1">
      <SpouseRow label="本人" value={selfValue} />
      {showSpouse && <SpouseRow label="配偶者" value={spValue} />}
    </div>
  );
}

export default function KpiGrid({
  analysis: a, mcResult, mode, strategy, retAge, idecoReceiveType,
  hasIdeco, hasSeverance,
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

  // Spouse retirement display condition
  const showSpouseRetirement = (a.spIdecoLumpNet ?? 0) > 0 || (a.spRetirementTaxKPI ?? 0) > 0 || (a.spSeveranceNetKPI ?? 0) > 0;

  const tier4Expandable = hasIdeco || hasSeverance;

  // Tier3 iDeCo value: household total (main + spouse)
  const idecoSelfNet = idecoReceiveType === 'lump' ? a.idecoLumpNet : a.idecoTotalNetWithdrawal;
  const idecoTier3Value = idecoSelfNet + (a.spIdecoLumpNet ?? 0);

  void mode;

  return (
    <div className="flex flex-col gap-3">
      {/* Tier1: 3枚・常時 — 資産寿命 / FIRE達成 / MC破綻確率 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          label="資産寿命"
          value={a.dA != null ? `退職後 ${a.dA - retAge}年` : '枯渇なし'}
          sub={a.dA != null ? `${a.dA}歳で枯渇` : undefined}
          variant={a.dA != null ? 'danger' : 'good'}
          tooltip="退職後に資産が枯渇するまでの年数。「枯渇なし」は終端年齢まで資産がプラスを維持することを示します。"
        />
        <KpiCard
          label="FIRE達成"
          value={ageStr(a.fA)}
          sub="資産 ≥ 支出×25 を維持"
          variant={a.fA != null ? 'good' : 'neutral'}
          tooltip="取崩期を通じて資産が「年間支出×25」を下回らない最速の退職年齢。達成できない場合は「—」を表示します。"
        />
        <KpiCard
          label="MC 破綻確率"
          value={mcStr ?? '—'}
          sub={mcStr ? '1,000試行・90歳時点' : 'MCモードで実行'}
          variant={mcStr ? mcVariant : 'neutral'}
          tooltip="モンテカルロ法（1,000試行）で終端年齢時点に資産が枯渇する試行の割合。運用利回りのランダムなブレを考慮しています。10%未満が目安とされます。"
        />
      </div>

      {/* Tier2: 3枚・常時 — 最終資産 / 初年度取崩率 / 収支転換点 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard
          label="最終資産"
          value={fmt(a.last)}
          sub={`${retAge}歳退職`}
          variant={lastVariant}
          tooltip="終端年齢（余命設定）時点の総資産額。0円の場合は資産が枯渇していることを示します。"
        />
        <KpiCard
          label="初年度取崩率"
          value={wrStr}
          sub="退職直後の実効引出率"
          variant={wrVariant}
          tooltip="退職初年度の実質引出額 ÷ 退職時総資産。4%ルールでは4%以下が長期的に持続可能な目安とされています。"
        />
        <KpiCard
          label="収支転換点"
          value={ageStr(a.breakEven)}
          sub="CF がマイナスに転じる年齢"
          tooltip="年金等の収入が生活費を下回り始める年齢。この年齢以降、資産の取崩ペースが加速します。年金受給開始により後ろにずれることがあります。"
        />
      </div>

      {/* Tier3: 資産ピーク（常時）/ iDeCo受取（hasIdecoのとき） */}
      <div className={`grid gap-3 ${tier3Cols}`}>
        <KpiCard
          label="資産ピーク"
          value={fmt(a.pV)}
          sub={ageStr(a.pA)}
          tooltip="シミュレーション期間中の総資産の最高値とその年齢。積立期の最後付近か、退職金受取年になることが多いです。"
        />
        {showIdecoTier3 && (
          <KpiCard
            label="iDeCo受取（手取り）"
            value={fmt(idecoTier3Value)}
            sub={idecoSub}
            tooltip={
              idecoReceiveType === 'lump'
                ? `iDeCo一時金から退職所得控除（退職金と合算）を適用した税引後の手取り額。${showSpouseRetirement ? '配偶者のiDeCo受取を含む世帯合計。' : ''}`
                : 'iDeCo年金受取期間の合計受取額から、公的年金等控除を適用した税引後の手取り総額。'
            }
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
            value={fmt(idecoTier3Value)}
            footer={
              <DetailBreakdown
                selfValue={fmt(idecoSelfNet)}
                spValue={fmt(a.spIdecoLumpNet)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
          <KpiCard
            label="退職金（手取り）"
            value={fmt(a.severanceNetKPI + (a.spSeveranceNetKPI ?? 0))}
            footer={
              <DetailBreakdown
                selfValue={fmt(a.severanceNetKPI)}
                spValue={fmt(a.spSeveranceNetKPI)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
          <KpiCard
            label="退職所得税（合計）"
            value={fmt(a.idecoLumpTax + (a.spRetirementTaxKPI ?? 0))}
            tooltip="iDeCo一時金・退職金の合算課税。退職所得控除を適用した後の実効税額（本人・配偶者の合計）。"
            footer={
              <DetailBreakdown
                selfValue={fmt(a.idecoLumpTax)}
                spValue={fmt(a.spRetirementTaxKPI)}
                showSpouse={showSpouseRetirement}
              />
            }
          />
        </div>
      )}
    </div>
  );
}
