'use client';

// 計画の保存操作UI（claude_instruction_phase2_yojitsu_v1_plan_and_compare.md 4節）。
// 資産管理ツール画面側に設置する。シミュレーター画面（simulatorStore.ts/ProfileDrawer.tsx）は
// 一切変更しない。連携済みシミュレータープロファイルの設定は、Storeのライブ状態ではなく
// loadProfiles()（保存済みプロファイル一覧）から読み取る。

import { useState, useEffect } from 'react';
import { loadProfiles as loadSimulatorProfiles } from '@/lib/storage';
import { profileToSimParams } from '@/lib/profile';
import { generatePlan } from '@/lib/planSnapshot/generatePlan';
import { savePlan, listPlans, deletePlan } from '@/lib/planSnapshot/storage';
import type { PlanSnapshot } from '@/lib/planSnapshot/types';
import type { LifeEvent } from '@/lib/types';
import type { CorporateYearSnap } from '@/lib/hojinCompanyState/types';
import { getCompanyStateForProfile } from '@/lib/hojinCompanyState/storageByProfile';
import { simulateCorporateAssets } from '@/lib/hojinCompanyState/corporateGrowth';
import { buildCorporateGeneratedEventsFromSnaps } from '@/lib/hojinCompanyState/buildCombinedSimulationInput';

interface PlanManagerPanelProps {
  currentProfileId: string;
  linkedSimulatorProfileId: number | null;
  onSaved: (plan: PlanSnapshot) => void;
}

export default function PlanManagerPanel({ currentProfileId, linkedSimulatorProfileId, onSaved }: PlanManagerPanelProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // claude_instruction_extraEvents_toggle_implementation_v2.md：法人取崩の織り込みは
  // useSimulatorStoreのライブstate（ページ跨ぎで空になる）ではなく、companyStateByProfile
  // （永続化データ、getCompanyStateForProfile()）から都度再計算する方式に変更した
  // （前回実装がページ跨ぎで機能しなかった不具合の修正）。個人側profileと同じ
  // 「最後にシミュレーター画面で保存した時点」を基準にする設計に統一している。
  const [includeExtraEvents, setIncludeExtraEvents] = useState(false);

  // linkedSimulatorProfileIdはuseAssetManagerProfileStore（localStorageから同期的に初期化される
  // Zustandストア）由来のため、SSR（常にwindow未定義→空扱い）とクライアント初回レンダー（実データあり）
  // で描画されるDOM構造（<input>の有無）が食い違い、Reactのハイドレーションエラーになる
  // （AssetManagementPage.tsxのincludeCorporate等、既存コードの複数箇所にある同種の対策コメント
  // 参照）。マウント完了までは常に「未連携」表示に固定し、マウント後のuseEffectで実際の値に切り替える。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // チェックボックスの初期値：linkedSimulatorProfileIdが確定した時点（マウント時／プロファイル
  // 切替時）で、永続化データ（companyStateByProfile）上の法人取崩トグル状態を読む。
  useEffect(() => {
    if (linkedSimulatorProfileId == null) {
      setIncludeExtraEvents(false);
      return;
    }
    const companyState = getCompanyStateForProfile(linkedSimulatorProfileId);
    setIncludeExtraEvents(companyState.settings.includeInPersonalSimulator);
  }, [linkedSimulatorProfileId]);

  const linked = mounted && linkedSimulatorProfileId != null;

  const handleSave = () => {
    if (linkedSimulatorProfileId == null) return;
    const simulatorProfile = loadSimulatorProfiles().find((p) => p.id === linkedSimulatorProfileId);
    if (!simulatorProfile) {
      setError('連携先のシミュレータープロファイルが見つかりませんでした（削除された可能性があります）');
      return;
    }
    // claude_instruction_banner_and_duplicate_plan_fix.md 2節：AssetManagerProfilePanel.tsxの
    // 既存パターン（同名時にwindow.confirm→OKなら上書き）を踏襲する。押下時点の最新一覧を
    // 都度取得し、trimmed名が空文字列の場合は重複チェックの対象外（未入力可の仕様のまま）。
    const trimmedName = name.trim();
    if (trimmedName !== '') {
      const matched = listPlans(currentProfileId).find((p) => p.name === trimmedName);
      if (matched) {
        const confirmed = window.confirm(
          `「${trimmedName}」はすでに存在します。上書きすると、既存の計画は削除され、新しい内容に置き換わります。よろしいですか？`
        );
        if (!confirmed) return;
        deletePlan(matched.id);
      }
    }
    // 欠損フィールドの補完（SAMPLE_PROFILEマージ）はgeneratePlan()自身が行う
    // （claude_instruction_phase2_yojitsu_polish.md 0節）。
    setSaving(true);
    setError(null);
    try {
      // 保存ボタン押下時点で改めてgetCompanyStateForProfile()を呼び直す（マウント時の値を
      // キャッシュしたまま使い回さない）。CorporateSettingsSection.tsxのuseEffectと同一パターン。
      let extraEvents: LifeEvent[] | undefined;
      // claude_instruction_combined_line_implementation.md：チェックON時に計算済みの
      // corporateSnaps（これまで捨てていた）をそのままgeneratePlan()のoptsへ渡し、
      // PlanSnapshotに保存する（予実比較の「合算」線が使う）。
      let corporateSnaps: CorporateYearSnap[] | undefined;
      if (includeExtraEvents) {
        const companyState = getCompanyStateForProfile(linkedSimulatorProfileId);
        const p = profileToSimParams(simulatorProfile);
        corporateSnaps = simulateCorporateAssets(
          companyState.settings,
          p.curAge,
          p.lifeEx,
          companyState.portfolio,
          companyState.events,
          null,
        );
        extraEvents = buildCorporateGeneratedEventsFromSnaps(corporateSnaps, companyState.settings.effectiveTaxRate);
      }
      const plan = generatePlan(simulatorProfile, {
        profileId: currentProfileId,
        simulatorProfileId: linkedSimulatorProfileId,
        name,
        ...(extraEvents ? { extraEvents } : {}),
        includesHojinDrawdown: includeExtraEvents,
        ...(corporateSnaps ? { corporateSnaps } : {}),
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
        <div className="flex flex-col gap-2">
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
          <div>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <input
                type="checkbox"
                checked={includeExtraEvents}
                onChange={(e) => setIncludeExtraEvents(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              法人取崩を織り込む
            </label>
            <p className="mt-0.5 pl-5 text-[10px] text-slate-400">
              最後にシミュレーター画面で保存した時点の法人設定を使用します
            </p>
          </div>
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
