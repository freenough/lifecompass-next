'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/components/simulator/KpiCard';
import PersonalizationRatioSlider from './PersonalizationRatioSlider';
import type { HojinAssetHolding, HojinCopiedPersonalHolding, HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';

interface HojinAssetProgressPanelProps {
  hojinHoldings: HojinAssetHolding[];
  personalHoldings: HojinCopiedPersonalHolding[];
  snapshots: HojinAssetSnapshot[];
  targetAmount: number;
  onChangeTarget: (amount: number) => void;
  personalizationRatio: number;
  onChangeRatio: (ratio: number) => void;
  /** 「前回記録比」カードのみ6.3節のトグルに追従する。他（目標までの進捗・積み上げバー等）は追従しない。 */
  displayScope: 'hojin' | 'combined';
}

// 個人資産管理ツールのAssetProgressPanel.tsx（ロック対象）のカード3枚構成を踏襲しつつ、
// 積み上げバー・個人化想定比率スライダーを追加（7章）。
export default function HojinAssetProgressPanel({
  hojinHoldings,
  personalHoldings,
  snapshots,
  targetAmount,
  onChangeTarget,
  personalizationRatio,
  onChangeRatio,
  displayScope,
}: HojinAssetProgressPanelProps) {
  const [targetInput, setTargetInput] = useState(targetAmount > 0 ? String(targetAmount) : '');
  useEffect(() => {
    setTargetInput(targetAmount > 0 ? String(targetAmount) : '');
  }, [targetAmount]);

  const hojinTotal = hojinHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  const personalTotal = personalHoldings.reduce((s, h) => s + (h.amount || 0), 0);

  // 7章：目標までの進捗は個人資産パネルの金額のみを分子とする。法人保有資産は含めない。
  const progressPct = targetAmount > 0 ? (personalTotal / targetAmount) * 100 : null;
  const remaining = targetAmount > 0 ? targetAmount - personalTotal : null;

  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const currentScopedTotal = displayScope === 'combined' ? hojinTotal + personalTotal : hojinTotal;
  const lastScopedTotal = latest
    ? (displayScope === 'combined' ? latest.totalHojinAmount + latest.totalPersonalAmount : latest.totalHojinAmount)
    : null;
  const diffFromLast = latest && lastScopedTotal !== null ? currentScopedTotal - lastScopedTotal : null;
  const diffFromLastPct = latest && lastScopedTotal !== null && lastScopedTotal > 0 && diffFromLast !== null
    ? (diffFromLast / lastScopedTotal) * 100
    : null;

  // 積み上げバー：個人資産＋法人保有資産、目標資産額をマーカーで示す。
  const barTotal = personalTotal + hojinTotal;
  const barBase = Math.max(barTotal, targetAmount, 1);
  const personalPct = Math.min(100, (personalTotal / barBase) * 100);
  const hojinPct = Math.min(100 - personalPct, (hojinTotal / barBase) * 100);
  const markerPct = targetAmount > 0 ? Math.min(100, (targetAmount / barBase) * 100) : null;
  const personalizedAmount = Math.round(hojinTotal * (personalizationRatio / 100));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="目標資産額"
          value={targetAmount > 0 ? `${targetAmount.toLocaleString()}万円` : '未設定'}
          footer={
            <div className="mt-2 flex gap-1">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={() => {
                  const n = Number(targetInput);
                  onChangeTarget(isNaN(n) ? 0 : n);
                }}
                min={0}
                placeholder="例: 10000"
                className="w-full text-xs border border-slate-300 rounded px-1 py-1"
              />
              <span className="text-xs text-slate-400 self-center shrink-0">万円</span>
            </div>
          }
        />
        <KpiCard
          label="目標までの進捗"
          value={progressPct !== null ? `${progressPct.toFixed(1)}%` : '目標未設定'}
          sub={remaining !== null ? `残り ${Math.max(0, remaining).toLocaleString()}万円（個人資産のみ）` : undefined}
          variant={progressPct !== null && progressPct >= 100 ? 'good' : 'neutral'}
        />
        <KpiCard
          label="前回記録比"
          value={diffFromLast !== null ? `${diffFromLast >= 0 ? '+' : ''}${diffFromLast.toLocaleString()}万円` : '比較対象がありません'}
          sub={diffFromLastPct !== null && latest ? `${diffFromLastPct >= 0 ? '+' : ''}${diffFromLastPct.toFixed(1)}%（${latest.date}比）` : undefined}
          variant={diffFromLast !== null ? (diffFromLast >= 0 ? 'good' : 'warn') : 'neutral'}
        />
      </div>

      {/* 積み上げバー：個人資産（実線塗り）＋法人保有資産（斜線パターン）、目標資産額マーカー */}
      <div className="rounded-lg border border-slate-200 p-4">
        {/* 4.5節：見出し右側の合計額は3章の中央ドーナツ表示・積み上げバー本体と同じ
            currentScopedTotal/barTotal相当の計算（hojinTotal＋personalTotal、displayScope連動）を
            使うため、3箇所で数値がズレることはない。 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">個人資産＋法人保有資産</h3>
          <span className="text-sm font-bold text-slate-800">合計 {currentScopedTotal.toLocaleString()}万円</span>
        </div>
        <div className="relative w-full h-6 rounded-full bg-slate-100 overflow-hidden flex">
          <div style={{ width: `${personalPct}%`, backgroundColor: '#2a78d6' }} aria-hidden="true" />
          <div
            style={{
              width: `${hojinPct}%`,
              backgroundImage: 'repeating-linear-gradient(45deg, #6b4423, #6b4423 4px, transparent 4px, transparent 8px)',
              backgroundColor: 'rgba(107,68,35,0.25)',
            }}
            aria-hidden="true"
          />
          {markerPct !== null && (
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-900"
              style={{ left: `calc(${markerPct}% - 1px)` }}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#2a78d6' }} aria-hidden="true" />
            個人資産: {personalTotal.toLocaleString()}万円
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm shrink-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #6b4423, #6b4423 2px, transparent 2px, transparent 4px)',
                backgroundColor: 'rgba(107,68,35,0.25)',
              }}
              aria-hidden="true"
            />
            法人保有資産（個人化想定額: {personalizedAmount.toLocaleString()}万円）: {hojinTotal.toLocaleString()}万円
          </div>
          {targetAmount > 0 && (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="inline-block w-0.5 h-3 bg-slate-900 shrink-0" aria-hidden="true" />
              目標資産額: {targetAmount.toLocaleString()}万円
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <PersonalizationRatioSlider ratio={personalizationRatio} onChange={onChangeRatio} hojinTotal={hojinTotal} />
      </div>
    </div>
  );
}
