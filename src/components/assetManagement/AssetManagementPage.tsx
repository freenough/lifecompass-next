'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import {
  ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_CATEGORY,
  CASH_ASSET_CLASS,
  HOJIN_ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY,
  HOJIN_CATEGORY_DEFAULT_ASSET_CLASS,
} from '@/lib/assetManagement/categories';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import type { AssetDisplayScope } from '@/lib/assetManagement/csvHistory';
import type { ImportResult } from '@/lib/assetManagement/exportImport';
import {
  loadHoldings,
  saveHoldings,
  loadSnapshots,
  addSnapshot,
  loadTargetAmount,
  saveTargetAmount,
  resetAll as resetPersonalAll,
} from '@/lib/assetManagement/storage';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadSnapshots as loadHojinSnapshots,
  addSnapshot as addHojinSnapshot,
  loadTargetAmount as loadHojinTargetAmount,
  saveTargetAmount as saveHojinTargetAmount,
  loadPersonalizationRatio,
  savePersonalizationRatio,
  resetAll as resetHojinAll,
} from '@/lib/hojinAssetManagement/storage';
import { clearTransferLog } from '@/lib/hojinAssetManagement/transferLog';
import AssetHoldingCard from './AssetHoldingCard';
import AssetProgressPanel from './AssetProgressPanel';
import AssetAllocationChangeTable from './AssetAllocationChangeTable';
import MonthlyRecordBanner from './MonthlyRecordBanner';
import AssetExportImportControls from './AssetExportImportControls';
import AssetResetControls, { type ResetScope } from './AssetResetControls';
import HojinAssetHoldingCard from '@/components/hojinAssetManagement/HojinAssetHoldingCard';
import HojinAssetProgressPanel from '@/components/hojinAssetManagement/HojinAssetProgressPanel';
import HojinAssetAllocationChangeTable from '@/components/hojinAssetManagement/HojinAssetAllocationChangeTable';
import HojinTransferHelper from '@/components/hojinAssetManagement/HojinTransferHelper';

// Rechartsコンポーネントは必ずssr:falseの動的importで読み込む（ResponsiveContainerが
// DOM計測に依存するため。HeroDemo.tsx/src/app/page.tsxの既存パターンを踏襲）。
const AssetAllocationChart = dynamic(() => import('./AssetAllocationChart'), { ssr: false });
const AssetSnapshotHistory = dynamic(() => import('./AssetSnapshotHistory'), { ssr: false });
const HojinAssetAllocationChart = dynamic(() => import('@/components/hojinAssetManagement/HojinAssetAllocationChart'), { ssr: false });
const HojinAssetSnapshotHistory = dynamic(() => import('@/components/hojinAssetManagement/HojinAssetSnapshotHistory'), { ssr: false });

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssetManagementPage() {
  const [holdings, setHoldings] = useState<AssetHolding[]>(() => loadHoldings());
  const [snapshots, setSnapshots] = useState<AssetSnapshot[]>(() => loadSnapshots());
  const [targetAmount, setTargetAmount] = useState<number>(() => loadTargetAmount());
  // モバイル（lg:未満）のみ有効な「入力を編集」トグル。lg:以上は常時展開
  // （既存シミュレーター本体のformOpenパターンを参照して踏襲、7章）。
  const [formOpen, setFormOpen] = useState(false);

  // フェーズ1（資産管理ツール統合）：法人資産（一人法人）セクション。CompanyState
  // （SimulatorForm.tsx＋CorporateSettingsSection.tsx）と同じ「トグルで展開」パターンを
  // 踏襲しつつ、資産管理ツールは単純なCRUD・表示のみのため、Zustandストアを新設せず
  // このページ1つでstateを保持する（個人・法人のholdingsを同じ場所で持つことで、
  // 法人セクションが個人資産を「常にライブ参照」できるようにし、フェーズ1の目的である
  // 「個人データをインポート」ボタン廃止・食い違いバグの構造的解消を実現する）。
  // 初期値はSSR/クライアントで一致させるため常にfalseにし、法人データがあればマウント後の
  // useEffectでONに切り替える（localStorage読み取り結果をuseStateの初期化関数に直接使うと、
  // サーバー側（window未定義＝常に空）とクライアント側（実データあり）でレンダー結果が食い違い、
  // 条件分岐でDOM構造ごと変わるためReactのハイドレーションエラーになる）。
  const [includeCorporate, setIncludeCorporate] = useState(false);
  useEffect(() => {
    if (loadHojinHoldings().length > 0) setIncludeCorporate(true);
  }, []);
  const [hojinHoldings, setHojinHoldings] = useState<AssetHolding[]>(() => loadHojinHoldings());
  const [hojinSnapshots, setHojinSnapshots] = useState<HojinAssetSnapshot[]>(() => loadHojinSnapshots());
  const [hojinTargetAmount, setHojinTargetAmount] = useState<number>(() => loadHojinTargetAmount());
  const [personalizationRatio, setPersonalizationRatio] = useState<number>(() => loadPersonalizationRatio());
  // 表示：個人のみ／合算。/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す
  // （法人資産管理ツール単体だった頃の「法人のみ／合算」から意味が反転している）。
  // csv_yyyymm_format_and_import_scope_fix.md 2章：CSV Export/Importのスコープ判断も
  // 新しい概念を作らずこのトグル1つを共有する（AssetDisplayScope型はこの値と同じ型）。
  const [displayScopePref, setDisplayScopePref] = useState<AssetDisplayScope>('combined');

  // 保存上限（MAX_SNAPSHOTS）超過による自動削除の通知バナー（追加実装2章）。
  const [removalNotice, setRemovalNotice] = useState<string | null>(null);
  const notifyRemoved = (removedGroups: Array<{ date: string }[]>) => {
    const all = removedGroups.flat();
    if (all.length === 0) return;
    const dates = all.map((r) => r.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    const range = first === last ? first : `${first}〜${last}`;
    setRemovalNotice(`保存上限のため、${range}の記録を自動削除しました`);
  };

  const updateHoldings = (next: AssetHolding[]) => {
    setHoldings(next);
    saveHoldings(next);
  };

  const handleAdd = (category: string) => {
    const isCash = category === '現金';
    const allowed = ALLOWED_ASSET_CLASSES_BY_CATEGORY[category as keyof typeof ALLOWED_ASSET_CLASSES_BY_CATEGORY];
    const defaultAssetClass = isCash ? CASH_ASSET_CLASS : (allowed?.[0]?.key ?? '全世界株');
    const holding: AssetHolding = {
      id: newId(),
      owner: 'personal',
      accountCategory: category,
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
      profileId: 'default',
    };
    updateHoldings([...holdings, holding]);
  };

  const handleChange = (id: string, patch: Partial<AssetHolding>) => {
    updateHoldings(
      holdings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const handleDelete = (id: string) => {
    updateHoldings(holdings.filter((h) => h.id !== id));
  };

  const updateHojinHoldings = (next: AssetHolding[]) => {
    setHojinHoldings(next);
    saveHojinHoldings(next);
  };

  const handleAddHojin = (category: string) => {
    const key = category as keyof typeof ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY;
    const defaultAssetClass = HOJIN_CATEGORY_DEFAULT_ASSET_CLASS[key] ?? ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[key]?.[0]?.key ?? '全世界株';
    const holding: AssetHolding = {
      id: newId(),
      owner: 'corporate',
      accountCategory: category,
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
      profileId: 'default',
    };
    updateHojinHoldings([...hojinHoldings, holding]);
  };

  const handleChangeHojin = (id: string, patch: Partial<AssetHolding>) => {
    updateHojinHoldings(
      hojinHoldings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const handleDeleteHojin = (id: string) => {
    updateHojinHoldings(hojinHoldings.filter((h) => h.id !== id));
  };

  // 「記録する」押下時：個人資産は常に記録し、法人資産を含めるトグルON時は、その瞬間の
  // 個人holdings state（=まさに今ライブ表示している値）をそのまま法人スナップショットにも
  // 自動的に書き込む。手動の「個人データをインポート」操作は不要（フェーズ1の核心）。
  const handleRecord = () => {
    const { snapshots: nextSnapshots, removed } = addSnapshot(holdings);
    setSnapshots(nextSnapshots);
    if (includeCorporate) {
      const { snapshots: nextHojinSnapshots, removed: removedHojin } = addHojinSnapshot(hojinHoldings, holdings);
      setHojinSnapshots(nextHojinSnapshots);
      notifyRemoved([removed, removedHojin]);
    } else {
      notifyRemoved([removed]);
    }
  };

  const handleChangeTarget = (amount: number) => {
    setTargetAmount(amount);
    saveTargetAmount(amount);
  };

  const handleChangeHojinTarget = (amount: number) => {
    setHojinTargetAmount(amount);
    saveHojinTargetAmount(amount);
  };

  const handleChangeRatio = (ratio: number) => {
    setPersonalizationRatio(ratio);
    savePersonalizationRatio(ratio);
  };

  // simplify_csv_scope_and_fix_graph_history_bug.md 2章：Export/Importが表示トグルと無関係に
  // なり、個人・法人どちらのストアが更新されたかに関わらず戻り値は常に両ストアの最新状態を
  // 含むため（ImportResult）、旧来の「個人用」「法人用」2つのハンドラに分ける必要がなくなった。
  const handleImported = (result: ImportResult) => {
    setHoldings(result.holdings);
    setSnapshots(result.snapshots);
    setHojinHoldings(result.hojinHoldings);
    setHojinSnapshots(result.hojinSnapshots);
    // json_export_completeness_and_history_bug.md 2章：JSON Importで設定値も上書きされうる
    // ようになったため、ページ側stateも同期する（CSV/legacy経路は現在値の素通しなので無害）。
    setTargetAmount(result.targetAmount);
    setHojinTargetAmount(result.hojinTargetAmount);
    setPersonalizationRatio(result.personalizationRatio);
  };

  // 全データリセット（追加実装4章）。対象範囲ごとにストレージを削除したうえで、
  // 各stateをストレージから読み直す（削除後は空配列・デフォルト設定値になる）。
  const handleReset = (scope: ResetScope, includeSettings: boolean) => {
    if (scope === 'personal' || scope === 'both') {
      resetPersonalAll({ includeSettings });
      setHoldings(loadHoldings());
      setSnapshots(loadSnapshots());
      setTargetAmount(loadTargetAmount());
    }
    if (scope === 'hojin' || scope === 'both') {
      resetHojinAll({ includeSettings });
      clearTransferLog();
      setHojinHoldings(loadHojinHoldings());
      setHojinSnapshots(loadHojinSnapshots());
      setHojinTargetAmount(loadHojinTargetAmount());
      setPersonalizationRatio(loadPersonalizationRatio());
    }
  };

  const totalAmount = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  const hojinTotal = hojinHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  // 法人保有資産が未入力のときは「個人のみ」に固定する（合算しても差が出ないため）。
  const hojinIsEmpty = hojinHoldings.length === 0 || hojinTotal === 0;
  const displayScope: AssetDisplayScope = hojinIsEmpty ? 'personalOnly' : displayScopePref;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2A4A] mb-2">資産管理</h1>
        <p className="text-sm text-slate-500">保有資産を記録して、毎月のFIRE進捗を確認します。</p>
      </div>

      <div className="mb-6">
        <MonthlyRecordBanner snapshots={snapshots} onRecord={handleRecord} />
      </div>

      {removalNotice && (
        <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">{removalNotice}</p>
          <button
            onClick={() => setRemovalNotice(null)}
            className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
          >
            閉じる
          </button>
        </div>
      )}

      {/* デスクトップ(lg:1024px以上)は左右2カラム、モバイルは上下積み。
          既存の資産シミュレーター本体（src/app/app/page.tsx）の左サイドバー/右メイン分割・
          独立スクロール（lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto）パターンを踏襲。 */}
      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左: 入力カード群。scrollbar-gutter:stableで、スクロールバーの出現/消失による
            横幅の変動（1章バグの一因）を吸収する（Tailwindに標準ユーティリティが無いため
            任意値記法で指定）。 */}
        <div className="lg:w-80 lg:shrink-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">保有資産</h2>
            <span className="text-sm font-bold text-slate-800">合計 {totalAmount.toLocaleString()}万円</span>
          </div>

          {/* モバイルのみの開閉トグル（既存シミュレーターの「入力を編集/閉じる」ボタンの
              ラベル・矢印表現を参照して踏襲。フォーム全体がfixed配置される独自スクロール構成は
              このページでは不要なため、通常のドキュメントフロー内のボタンとして簡略化している）。 */}
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="lg:hidden w-full mb-3 rounded-lg border border-slate-300 bg-white py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            {formOpen ? '入力を閉じる ▲' : '入力を編集 ▼'}
          </button>

          <div className={`flex-col gap-3 lg:flex ${formOpen ? 'flex' : 'hidden'}`}>
            {ACCOUNT_CATEGORIES.map((category) => (
              <AssetHoldingCard
                key={category}
                category={category}
                holdings={holdings.filter((h) => h.accountCategory === category)}
                allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_CATEGORY[category]}
                onAdd={handleAdd}
                onChange={handleChange}
                onDelete={handleDelete}
              />
            ))}

            {/* 法人資産（一人法人）を含める：CompanyStateのSimulatorForm.tsx＋
                CorporateSettingsSection.tsxと同じトグル展開パターン。 */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-700">法人資産（一人法人）を含める</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={includeCorporate}
                  onClick={() => setIncludeCorporate((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    includeCorporate ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeCorporate ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {includeCorporate && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-slate-700">法人保有資産</h3>
                    <span className="text-xs font-bold text-slate-800">合計 {hojinTotal.toLocaleString()}万円</span>
                  </div>
                  {HOJIN_ACCOUNT_CATEGORIES.map((category) => (
                    <HojinAssetHoldingCard
                      key={category}
                      category={category}
                      holdings={hojinHoldings.filter((h) => h.accountCategory === category)}
                      allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[category]}
                      onAdd={handleAddHojin}
                      onChange={(id, patch) => handleChangeHojin(id, patch as Partial<AssetHolding>)}
                      onDelete={handleDeleteHojin}
                    />
                  ))}

                  <HojinTransferHelper
                    hojinHoldings={hojinHoldings}
                    personalHoldings={holdings}
                    personalizationRatio={personalizationRatio}
                    onUpdateHojinHoldings={updateHojinHoldings}
                    onUpdatePersonalHoldings={updateHoldings}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右: サマリー群 */}
        <div className="flex flex-1 flex-col gap-6 min-w-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
          {includeCorporate && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">表示:</span>
                <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
                  <button
                    type="button"
                    onClick={() => setDisplayScopePref('personalOnly')}
                    className={`px-3 py-1 ${displayScope === 'personalOnly' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    個人のみ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayScopePref('combined')}
                    disabled={hojinIsEmpty}
                    className={`px-3 py-1 ${displayScope === 'combined' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    合算
                  </button>
                </div>
              </div>
              {hojinIsEmpty && (
                <span className="text-xs text-slate-400">法人資産が未入力のため「個人のみ」で表示しています</span>
              )}
            </div>
          )}

          <section>
            {includeCorporate ? (
              <HojinAssetSnapshotHistory
                snapshots={hojinSnapshots}
                onRecord={handleRecord}
                displayScope={displayScope}
                currentPersonalTotal={totalAmount}
                currentHojinTotal={hojinTotal}
                personalSnapshots={snapshots}
              />
            ) : (
              <AssetSnapshotHistory snapshots={snapshots} onRecord={handleRecord} currentTotal={totalAmount} />
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">FIRE進捗</h2>
            {includeCorporate ? (
              <HojinAssetProgressPanel
                hojinHoldings={hojinHoldings}
                personalHoldings={holdings}
                snapshots={hojinSnapshots}
                targetAmount={hojinTargetAmount}
                onChangeTarget={handleChangeHojinTarget}
                personalizationRatio={personalizationRatio}
                onChangeRatio={handleChangeRatio}
                displayScope={displayScope}
                personalSnapshots={snapshots}
              />
            ) : (
              <AssetProgressPanel
                holdings={holdings}
                snapshots={snapshots}
                targetAmount={targetAmount}
                onChangeTarget={handleChangeTarget}
              />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">資産クラス内訳</h2>
            {includeCorporate ? (
              <HojinAssetAllocationChart hojinHoldings={hojinHoldings} personalHoldings={holdings} displayScope={displayScope} />
            ) : (
              <AssetAllocationChart holdings={holdings} totalAmount={totalAmount} />
            )}
          </section>

          {includeCorporate ? (
            <HojinAssetAllocationChangeTable
              hojinHoldings={hojinHoldings}
              personalHoldings={holdings}
              snapshots={hojinSnapshots}
              displayScope={displayScope}
              personalSnapshots={snapshots}
            />
          ) : (
            <AssetAllocationChangeTable holdings={holdings} snapshots={snapshots} />
          )}

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">Export / Import</h2>
            <AssetExportImportControls
              holdings={holdings}
              snapshots={snapshots}
              hojinHoldings={hojinHoldings}
              hojinSnapshots={hojinSnapshots}
              onImported={handleImported}
              onRemoved={(removed) => notifyRemoved([removed.personal, removed.hojin])}
            />
          </section>

          <section>
            <AssetResetControls onReset={handleReset} />
          </section>
        </div>
      </div>
    </main>
  );
}
