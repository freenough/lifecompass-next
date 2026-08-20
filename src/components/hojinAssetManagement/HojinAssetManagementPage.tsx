'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  HOJIN_ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY,
  HOJIN_CATEGORY_DEFAULT_ASSET_CLASS,
} from '@/lib/hojinAssetManagement/categories';
import type { HojinAssetHolding, HojinCopiedPersonalHolding, HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';
import {
  loadHojinHoldings,
  saveHojinHoldings,
  loadPersonalHoldings,
  savePersonalHoldings,
  loadPersonalLastUpdatedAt,
  loadSnapshots,
  addSnapshot,
  loadTargetAmount,
  saveTargetAmount,
  loadPersonalizationRatio,
  savePersonalizationRatio,
} from '@/lib/hojinAssetManagement/storage';
import HojinAssetHoldingCard from './HojinAssetHoldingCard';
import PersonalAssetPanel from './PersonalAssetPanel';
import HojinAssetProgressPanel from './HojinAssetProgressPanel';
import HojinAssetAllocationChangeTable from './HojinAssetAllocationChangeTable';
import MonthlyRecordBanner from './MonthlyRecordBanner';
import HojinAssetExportImportControls from './HojinAssetExportImportControls';

// Rechartsコンポーネントは必ずssr:falseの動的importで読み込む（個人資産管理ツールと同じパターン）。
const HojinAssetAllocationChart = dynamic(() => import('./HojinAssetAllocationChart'), { ssr: false });
const HojinAssetSnapshotHistory = dynamic(() => import('./HojinAssetSnapshotHistory'), { ssr: false });

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function HojinAssetManagementPage() {
  const [hojinHoldings, setHojinHoldings] = useState<HojinAssetHolding[]>(() => loadHojinHoldings());
  const [personalHoldings, setPersonalHoldings] = useState<HojinCopiedPersonalHolding[]>(() => loadPersonalHoldings());
  const [personalLastUpdatedAt, setPersonalLastUpdatedAt] = useState<string>(() => loadPersonalLastUpdatedAt());
  const [snapshots, setSnapshots] = useState<HojinAssetSnapshot[]>(() => loadSnapshots());
  const [targetAmount, setTargetAmount] = useState<number>(() => loadTargetAmount());
  const [personalizationRatio, setPersonalizationRatio] = useState<number>(() => loadPersonalizationRatio());
  const [formOpen, setFormOpen] = useState(false);
  // 6.3節：法人のみ／合算 共通トグル。デフォルトは合算。
  const [displayScopePref, setDisplayScopePref] = useState<'hojin' | 'combined'>('combined');

  const personalTotal = personalHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  const personalIsEmpty = personalHoldings.length === 0 || personalTotal === 0;
  // 個人資産パネルが未入力のときは「法人のみ」に固定する（6.3節）。
  const displayScope: 'hojin' | 'combined' = personalIsEmpty ? 'hojin' : displayScopePref;

  const updateHojinHoldings = (next: HojinAssetHolding[]) => {
    setHojinHoldings(next);
    saveHojinHoldings(next);
  };

  const updatePersonalHoldings = (next: HojinCopiedPersonalHolding[]) => {
    const updatedAt = new Date().toISOString();
    setPersonalHoldings(next);
    setPersonalLastUpdatedAt(updatedAt);
    savePersonalHoldings(next, updatedAt);
  };

  const handleAddHojin = (category: string) => {
    const key = category as keyof typeof ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY;
    const defaultAssetClass = HOJIN_CATEGORY_DEFAULT_ASSET_CLASS[key] ?? ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[key]?.[0]?.key ?? '全世界株';
    const holding: HojinAssetHolding = {
      id: newId(),
      accountCategory: category as HojinAssetHolding['accountCategory'],
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
    };
    updateHojinHoldings([...hojinHoldings, holding]);
  };

  const handleChangeHojin = (id: string, patch: Partial<HojinAssetHolding>) => {
    updateHojinHoldings(
      hojinHoldings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const handleDeleteHojin = (id: string) => {
    updateHojinHoldings(hojinHoldings.filter((h) => h.id !== id));
  };

  const handleRecord = () => {
    setSnapshots(addSnapshot(hojinHoldings, personalHoldings, personalLastUpdatedAt));
  };

  const handleChangeTarget = (amount: number) => {
    setTargetAmount(amount);
    saveTargetAmount(amount);
  };

  const handleChangeRatio = (ratio: number) => {
    setPersonalizationRatio(ratio);
    savePersonalizationRatio(ratio);
  };

  const handleImported = (
    nextHojinHoldings: HojinAssetHolding[],
    nextPersonalHoldings: HojinCopiedPersonalHolding[],
    nextSnapshots?: HojinAssetSnapshot[],
  ) => {
    setHojinHoldings(nextHojinHoldings);
    setPersonalHoldings(nextPersonalHoldings);
    setPersonalLastUpdatedAt(loadPersonalLastUpdatedAt());
    if (nextSnapshots) setSnapshots(nextSnapshots);
  };

  const hojinTotal = hojinHoldings.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2A4A] mb-2">法人資産管理</h1>
        <p className="text-sm text-slate-500">
          一人法人の保有資産と個人資産をまとめて記録し、毎月の推移を確認します（Phase1：見える化のみ。シミュレーターへの連携は今後の対応予定です）。
        </p>
      </div>

      <div className="mb-6">
        <MonthlyRecordBanner snapshots={snapshots} onRecord={handleRecord} />
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:gap-6 lg:items-start">
        {/* 左: 入力カード群（法人保有資産＋個人資産パネル） */}
        <div className="lg:w-80 lg:shrink-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">法人保有資産</h2>
            <span className="text-sm font-bold text-slate-800">合計 {hojinTotal.toLocaleString()}万円</span>
          </div>

          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="lg:hidden w-full mb-3 rounded-lg border border-slate-300 bg-white py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            {formOpen ? '入力を閉じる ▲' : '入力を編集 ▼'}
          </button>

          <div className={`flex-col gap-3 lg:flex ${formOpen ? 'flex' : 'hidden'}`}>
            {HOJIN_ACCOUNT_CATEGORIES.map((category) => (
              <HojinAssetHoldingCard
                key={category}
                category={category}
                holdings={hojinHoldings.filter((h) => h.accountCategory === category)}
                allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_HOJIN_CATEGORY[category]}
                onAdd={handleAddHojin}
                onChange={(id, patch) => handleChangeHojin(id, patch as Partial<HojinAssetHolding>)}
                onDelete={handleDeleteHojin}
              />
            ))}

            <div className="mt-3 pt-3 border-t border-slate-200">
              <PersonalAssetPanel holdings={personalHoldings} onChange={updatePersonalHoldings} />
            </div>
          </div>
        </div>

        {/* 右: サマリー群 */}
        <div className="flex flex-1 flex-col gap-6 min-w-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
          {/* 6.3節：法人のみ／合算 共通トグル。資産推移・資産クラス内訳・資産配分の変化・
              FIRE進捗の「前回記録比」カードがこのトグルに追従する。 */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">表示:</span>
              <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
                <button
                  type="button"
                  onClick={() => setDisplayScopePref('hojin')}
                  className={`px-3 py-1 ${displayScope === 'hojin' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  法人のみ
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayScopePref('combined')}
                  disabled={personalIsEmpty}
                  className={`px-3 py-1 ${displayScope === 'combined' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  合算
                </button>
              </div>
            </div>
            {displayScope === 'combined' && personalLastUpdatedAt && (
              <span className="text-xs text-slate-400">
                個人資産は{new Date(personalLastUpdatedAt).toLocaleDateString('ja-JP')}時点の値
              </span>
            )}
            {personalIsEmpty && (
              <span className="text-xs text-slate-400">個人資産パネルが未入力のため「法人のみ」で表示しています</span>
            )}
          </div>

          <section>
            <HojinAssetSnapshotHistory snapshots={snapshots} onRecord={handleRecord} displayScope={displayScope} />
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">FIRE進捗</h2>
            <HojinAssetProgressPanel
              hojinHoldings={hojinHoldings}
              personalHoldings={personalHoldings}
              snapshots={snapshots}
              targetAmount={targetAmount}
              onChangeTarget={handleChangeTarget}
              personalizationRatio={personalizationRatio}
              onChangeRatio={handleChangeRatio}
              displayScope={displayScope}
            />
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">資産クラス内訳</h2>
            <HojinAssetAllocationChart hojinHoldings={hojinHoldings} personalHoldings={personalHoldings} displayScope={displayScope} />
          </section>

          <HojinAssetAllocationChangeTable
            hojinHoldings={hojinHoldings}
            personalHoldings={personalHoldings}
            snapshots={snapshots}
            displayScope={displayScope}
          />

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">Export / Import</h2>
            <HojinAssetExportImportControls
              hojinHoldings={hojinHoldings}
              personalHoldings={personalHoldings}
              snapshots={snapshots}
              onImported={handleImported}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
