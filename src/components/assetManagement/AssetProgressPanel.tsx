'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/components/simulator/KpiCard';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';

interface AssetProgressPanelProps {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
  targetAmount: number;
  onChangeTarget: (amount: number) => void;
}

export default function AssetProgressPanel({ holdings, snapshots, targetAmount, onChangeTarget }: AssetProgressPanelProps) {
  const [targetInput, setTargetInput] = useState(targetAmount > 0 ? String(targetAmount) : '');
  useEffect(() => {
    setTargetInput(targetAmount > 0 ? String(targetAmount) : '');
  }, [targetAmount]);

  const currentTotal = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  const progressPct = targetAmount > 0 ? (currentTotal / targetAmount) * 100 : null;
  const remaining = targetAmount > 0 ? targetAmount - currentTotal : null;

  const diffFromLast = latest ? currentTotal - latest.totalAmount : null;
  const diffFromLastPct = latest && latest.totalAmount > 0 && diffFromLast !== null
    ? (diffFromLast / latest.totalAmount) * 100
    : null;

  return (
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
        sub={remaining !== null ? `残り ${Math.max(0, remaining).toLocaleString()}万円` : undefined}
        variant={progressPct !== null && progressPct >= 100 ? 'good' : 'neutral'}
      />
      <KpiCard
        label="前回記録比"
        value={diffFromLast !== null ? `${diffFromLast >= 0 ? '+' : ''}${diffFromLast.toLocaleString()}万円` : '比較対象がありません'}
        sub={diffFromLastPct !== null && latest ? `${diffFromLastPct >= 0 ? '+' : ''}${diffFromLastPct.toFixed(1)}%（${latest.date}比）` : undefined}
        variant={diffFromLast !== null ? (diffFromLast >= 0 ? 'good' : 'warn') : 'neutral'}
      />
    </div>
  );
}
