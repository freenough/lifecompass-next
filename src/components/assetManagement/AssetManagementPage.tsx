'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
  ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_CATEGORY,
  CASH_ASSET_CLASS,
} from '@/lib/assetManagement/categories';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import {
  loadHoldings,
  saveHoldings,
  loadSnapshots,
  addSnapshot,
  loadTargetAmount,
  saveTargetAmount,
} from '@/lib/assetManagement/storage';
import AssetHoldingCard from './AssetHoldingCard';
import AssetProgressPanel from './AssetProgressPanel';
import AssetAllocationChangeTable from './AssetAllocationChangeTable';
import MonthlyRecordBanner from './MonthlyRecordBanner';
import AssetExportImportControls from './AssetExportImportControls';

// Rechartsコンポーネントは必ずssr:falseの動的importで読み込む（ResponsiveContainerが
// DOM計測に依存するため。HeroDemo.tsx/src/app/page.tsxの既存パターンを踏襲）。
const AssetAllocationChart = dynamic(() => import('./AssetAllocationChart'), { ssr: false });
// 3章で折れ線グラフ（Recharts）を追加したため、こちらも動的importに変更。
const AssetSnapshotHistory = dynamic(() => import('./AssetSnapshotHistory'), { ssr: false });

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

  const handleRecord = () => {
    setSnapshots(addSnapshot(holdings));
  };

  const handleChangeTarget = (amount: number) => {
    setTargetAmount(amount);
    saveTargetAmount(amount);
  };

  const handleImported = (nextHoldings: AssetHolding[], nextSnapshots: AssetSnapshot[]) => {
    setHoldings(nextHoldings);
    setSnapshots(nextSnapshots);
  };

  const totalAmount = holdings.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0F2A4A] mb-2">資産管理</h1>
        <p className="text-sm text-slate-500">保有資産を記録して、毎月のFIRE進捗を確認します。</p>
      </div>

      <div className="mb-6">
        <MonthlyRecordBanner snapshots={snapshots} onRecord={handleRecord} />
      </div>

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
          </div>
        </div>

        {/* 右: サマリー群 */}
        <div className="flex flex-1 flex-col gap-6 min-w-0 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:pr-4 lg:-mr-4">
          <section>
            <AssetSnapshotHistory snapshots={snapshots} onRecord={handleRecord} />
          </section>

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">FIRE進捗</h2>
            <AssetProgressPanel
              holdings={holdings}
              snapshots={snapshots}
              targetAmount={targetAmount}
              onChangeTarget={handleChangeTarget}
            />
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">資産クラス内訳</h2>
            <AssetAllocationChart holdings={holdings} totalAmount={totalAmount} />
          </section>

          <AssetAllocationChangeTable holdings={holdings} snapshots={snapshots} />

          <section>
            <h2 className="text-sm font-bold text-slate-700 mb-3">Export / Import</h2>
            <AssetExportImportControls holdings={holdings} snapshots={snapshots} onImported={handleImported} />
          </section>
        </div>
      </div>
    </main>
  );
}
