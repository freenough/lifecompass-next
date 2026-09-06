'use client';

import { useState, useEffect } from 'react';
import KpiCard from '@/components/simulator/KpiCard';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import { findPersonalSnapshot, findHojinSnapshot, getMergedRecordDates } from '@/lib/hojinAssetManagement/personalHistory';

interface HojinAssetProgressPanelProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  snapshots: HojinAssetSnapshot[];
  targetAmount: number;
  onChangeTarget: (amount: number) => void;
  /** 「前回記録比」カードのみ表示トグルに追従する。他（目標までの進捗等）は追従しない。 */
  displayScope: 'personalOnly' | 'combined';
  /**
   * 個人ストア自身の真の記録履歴。「前回記録比」の前回個人側金額は、法人スナップショットが持つ
   * totalPersonalAmount（記録タイミングによって歯抜けになりうる表示用の複製）ではなく、
   * こちらを該当年月で優先参照する（simplify_csv_scope_and_fix_graph_history_bug.md 1章）。
   */
  personalSnapshots: AssetSnapshot[];
}

// 個人資産管理ツールのAssetProgressPanel.tsx（ロック対象）のカード3枚構成を踏襲（7章）。
// instruction_asset_management_page_layout_review.md 0.1節：積み上げバー・個人化スライダーは
// このコンポーネントの担当範囲から外し、それぞれHojinAssetCompositionBar.tsx／
// AssetManagementPage.tsx内の「法人資産を個人化した場合」セクションへ分離した
// （並び替え後、この3枚のFIRE進捗カードが単独で最上部セクションになるため）。
export default function HojinAssetProgressPanel({
  hojinHoldings,
  personalHoldings,
  snapshots,
  targetAmount,
  onChangeTarget,
  displayScope,
  personalSnapshots,
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

  // claude_instruction_fix_hojin_toggle_history_graph_bug.md：「前回」の年月は法人スナップショット
  // 単独ではなく、個人・法人の日付の和集合から求める（個人単独の記録月も「前回」の候補にする）。
  const recordDates = getMergedRecordDates(personalSnapshots, snapshots);
  const latestDate = recordDates.length > 0 ? recordDates[recordDates.length - 1] : null;
  // フェーズ1：/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す。
  const currentScopedTotal = displayScope === 'combined' ? personalTotal + hojinTotal : personalTotal;
  // 1章：前回の個人側金額は、個人ストア自身の真の記録履歴を該当年月で優先参照する
  // （無ければ法人スナップショットの表示用複製totalPersonalAmountへフォールバック）。
  const lastHojinSnap = latestDate ? findHojinSnapshot(snapshots, latestDate) : undefined;
  const lastPersonalTotal = latestDate
    ? (findPersonalSnapshot(personalSnapshots, latestDate)?.totalAmount ?? lastHojinSnap?.totalPersonalAmount ?? 0)
    : null;
  const lastHojinTotal = lastHojinSnap?.totalHojinAmount ?? 0;
  const lastScopedTotal = latestDate
    ? (displayScope === 'combined' ? (lastPersonalTotal ?? 0) + lastHojinTotal : lastPersonalTotal ?? 0)
    : null;
  const diffFromLast = latestDate && lastScopedTotal !== null ? currentScopedTotal - lastScopedTotal : null;
  const diffFromLastPct = latestDate && lastScopedTotal !== null && lastScopedTotal > 0 && diffFromLast !== null
    ? (diffFromLast / lastScopedTotal) * 100
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
        sub={remaining !== null ? `残り ${Math.max(0, remaining).toLocaleString()}万円（個人資産のみ）` : undefined}
        variant={progressPct !== null && progressPct >= 100 ? 'good' : 'neutral'}
      />
      <KpiCard
        label="前回記録比"
        value={diffFromLast !== null ? `${diffFromLast >= 0 ? '+' : ''}${diffFromLast.toLocaleString()}万円` : '比較対象がありません'}
        sub={diffFromLastPct !== null && latestDate ? `${diffFromLastPct >= 0 ? '+' : ''}${diffFromLastPct.toFixed(1)}%（${latestDate}比）` : undefined}
        variant={diffFromLast !== null ? (diffFromLast >= 0 ? 'good' : 'warn') : 'neutral'}
        tooltip="「前回」は前月ではなく、直前に記録した回を指します（記録をスキップした月がある場合、前月とは一致しません）"
      />
    </div>
  );
}
