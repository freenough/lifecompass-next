'use client';

// 計画の保存操作UI（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 4節）。
// 資産管理ツール画面側に設置する。シミュレーター画面（simulatorStore.ts/ProfileDrawer.tsx）は
// 一切変更しない。連携済みシミュレータープロファイルの設定は、Storeのライブ状態ではなく
// loadProfiles()（保存済みプロファイル一覧）から読み取る。

import { useState, useEffect } from 'react';
import { loadProfiles as loadSimulatorProfiles } from '@/lib/storage';
import { generatePlan } from '@/lib/planSnapshot/generatePlan';
import { savePlan } from '@/lib/planSnapshot/storage';
import type { PlanSnapshot } from '@/lib/planSnapshot/types';

interface PlanManagerPanelProps {
  currentProfileId: string;
  linkedSimulatorProfileId: number | null;
  onSaved: (plan: PlanSnapshot) => void;
}

export default function PlanManagerPanel({ currentProfileId, linkedSimulatorProfileId, onSaved }: PlanManagerPanelProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // linkedSimulatorProfileIdはuseAssetManagerProfileStore（localStorageから同期的に初期化される
  // Zustandストア）由来のため、SSR（常にwindow未定義→空扱い）とクライアント初回レンダー（実データあり）
  // で描画されるDOM構造（<input>の有無）が食い違い、Reactのハイドレーションエラーになる
  // （AssetManagementPage.tsxのincludeCorporate等、既存コードの複数箇所にある同種の対策コメント
  // 参照）。マウント完了までは常に「未連携」表示に固定し、マウント後のuseEffectで実際の値に切り替える。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const linked = mounted && linkedSimulatorProfileId != null;

  const handleSave = () => {
    if (linkedSimulatorProfileId == null) return;
    const simulatorProfile = loadSimulatorProfiles().find((p) => p.id === linkedSimulatorProfileId);
    if (!simulatorProfile) {
      setError('連携先のシミュレータープロファイルが見つかりませんでした（削除された可能性があります）');
      return;
    }
    // 欠損フィールドの補完（SAMPLE_PROFILEマージ）はgeneratePlan()自身が行う
    // （claude_instruction_phase2_yojitsu_polish.md 0節）。
    setSaving(true);
    setError(null);
    try {
      const plan = generatePlan(simulatorProfile, {
        profileId: currentProfileId,
        simulatorProfileId: linkedSimulatorProfileId,
        name,
      });
      savePlan(plan);
      setName('');
      onSaved(plan);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      {linked ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="計画の名前（未入力可）"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {saving ? '計算中…' : '計画を保存'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">シミュレータープロファイルと連携すると計画を保存できます</span>
          <button type="button" disabled className="shrink-0 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed">
            計画を保存
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
