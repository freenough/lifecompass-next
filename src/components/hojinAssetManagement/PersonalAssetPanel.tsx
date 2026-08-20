'use client';

import {
  PERSONAL_ACCOUNT_CATEGORIES,
  ALLOWED_ASSET_CLASSES_BY_PERSONAL_CATEGORY,
  PERSONAL_CATEGORY_DEFAULT_ASSET_CLASS,
} from '@/lib/hojinAssetManagement/categories';
import type { HojinCopiedPersonalHolding } from '@/lib/hojinAssetManagement/types';
import { readPersonalToolHoldingsForImport } from '@/lib/hojinAssetManagement/storage';
import HojinAssetHoldingCard from './HojinAssetHoldingCard';

interface PersonalAssetPanelProps {
  holdings: HojinCopiedPersonalHolding[];
  onChange: (next: HojinCopiedPersonalHolding[]) => void;
}

function newId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 5章：個人資産管理ツール本体とは完全に独立したコピー。保存先も専用のlocalStorageキーで、
// 個人ツール本体への書き戻しは一切行わない。インポートは必須ではなく、直接入力のみでも
// 利用を開始できる。
export default function PersonalAssetPanel({ holdings, onChange }: PersonalAssetPanelProps) {
  const handleAdd = (category: string) => {
    const allowed = ALLOWED_ASSET_CLASSES_BY_PERSONAL_CATEGORY[category as keyof typeof ALLOWED_ASSET_CLASSES_BY_PERSONAL_CATEGORY];
    const defaultAssetClass = PERSONAL_CATEGORY_DEFAULT_ASSET_CLASS[category as keyof typeof PERSONAL_CATEGORY_DEFAULT_ASSET_CLASS] ?? allowed?.[0]?.key ?? '全世界株';
    const holding: HojinCopiedPersonalHolding = {
      id: newId(),
      owner: 'personal',
      accountCategory: category,
      assetClass: defaultAssetClass,
      amount: 0,
      updatedAt: new Date().toISOString(),
    };
    onChange([...holdings, holding]);
  };

  const handleChange = (id: string, patch: Partial<HojinCopiedPersonalHolding>) => {
    onChange(holdings.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h)));
  };

  const handleDelete = (id: string) => {
    onChange(holdings.filter((h) => h.id !== id));
  };

  const handleImport = () => {
    const confirmed = window.confirm(
      '個人資産のデータを上書きします。このパネルで編集した内容は失われます。よろしいですか？'
    );
    if (!confirmed) return;
    onChange(readPersonalToolHoldingsForImport());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-700">個人資産パネル</h3>
        <button
          onClick={handleImport}
          className="text-xs border border-slate-300 rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-50 whitespace-nowrap"
        >
          個人データをインポート
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {PERSONAL_ACCOUNT_CATEGORIES.map((category) => (
          <HojinAssetHoldingCard
            key={category}
            category={category}
            holdings={holdings.filter((h) => h.accountCategory === category)}
            allowedAssetClasses={ALLOWED_ASSET_CLASSES_BY_PERSONAL_CATEGORY[category]}
            showOwner
            onAdd={handleAdd}
            onChange={handleChange}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
