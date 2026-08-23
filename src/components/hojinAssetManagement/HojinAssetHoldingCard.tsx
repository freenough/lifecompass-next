'use client';

import type { AssetClassDef } from '@/lib/assetManagement/categories';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

// 個人資産管理ツールのAssetHoldingCard.tsx（ロック対象）の見た目・構造を参照して複製した
// もの（1.5節）。法人保有資産カテゴリ（owner概念なし）・個人資産パネル（owner概念あり）の
// 両方で共通利用できるよう、showOwnerで保有者selectの表示有無を切り替える汎用設計にしてある
// （1.5節表8行目：「同じコンポーネントを個人資産パネル用にも複製利用」）。

// 法人保有資産・個人資産パネルの両方の型が構造的に満たせる、カード表示に必要な最小限の形。
// ownerは個人資産パネル側のみ実際に値を持つ（法人保有資産側は省略可＝undefined）。
export interface HojinCardHolding {
  id: string;
  owner?: 'personal' | 'personal_spouse' | 'corporate';
  accountCategory: string;
  assetClass: string;
  amount: number;
  updatedAt: string;
}

interface HojinAssetHoldingCardProps {
  category: string;
  holdings: HojinCardHolding[];
  /** 空配列の場合は資産クラスのドロップダウンを表示しない（固定資産クラスのカテゴリ用）。 */
  allowedAssetClasses: AssetClassDef[];
  /** trueのとき保有者(本人/配偶者)selectを表示する（個人資産パネル用）。 */
  showOwner?: boolean;
  onAdd: (category: string) => void;
  onChange: (id: string, patch: Partial<HojinCardHolding>) => void;
  onDelete: (id: string) => void;
}

export default function HojinAssetHoldingCard({
  category,
  holdings,
  allowedAssetClasses,
  showOwner = false,
  onAdd,
  onChange,
  onDelete,
}: HojinAssetHoldingCardProps) {
  const isFixedClass = allowedAssetClasses.length === 0;
  const total = holdings.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{category}</span>
        <span className="text-xs text-slate-400">合計: {total.toLocaleString()}万円</span>
      </div>

      <div className="flex flex-col gap-2">
        {holdings.map((h) => (
          <div key={h.id} className="flex flex-nowrap items-center gap-1">
            {showOwner && (
              <select
                value={h.owner ?? 'personal'}
                onChange={(e) => onChange(h.id, { owner: e.target.value as HojinCardHolding['owner'] })}
                className="shrink-0 w-16 text-xs border border-slate-300 rounded px-1 py-1"
              >
                <option value="personal">本人</option>
                <option value="personal_spouse">配偶者</option>
              </select>
            )}
            {!isFixedClass && (
              <select
                value={h.assetClass}
                onChange={(e) => onChange(h.id, { assetClass: e.target.value })}
                className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-1 py-1"
              >
                {!allowedAssetClasses.some((a) => a.key === h.assetClass) && (
                  <option value={h.assetClass}>{getAssetClassLabel(h.assetClass)}(制約外)</option>
                )}
                {allowedAssetClasses.map((a) => (
                  <option key={a.key} value={a.key}>{getAssetClassLabel(a.key)}</option>
                ))}
              </select>
            )}
            <input
              type="number"
              value={h.amount}
              onFocus={(e) => clearZeroOrSelect(e.currentTarget)}
              onClick={(e) => clearZeroOrSelect(e.currentTarget)}
              onChange={(e) => {
                const cleaned = stripLeadingZero(e.target.value);
                if (cleaned !== e.target.value) e.target.value = cleaned;
                const n = e.target.valueAsNumber;
                onChange(h.id, { amount: isNaN(n) ? 0 : n });
              }}
              min={0}
              className="shrink-0 w-14 text-xs border border-slate-300 rounded px-1 py-1 text-right"
            />
            <span className="shrink-0 text-xs text-slate-400">万円</span>
            <button onClick={() => onDelete(h.id)} className="shrink-0 text-red-400 hover:text-red-600 text-xs px-1">×</button>
          </div>
        ))}

        <button
          onClick={() => onAdd(category)}
          className="text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-300 rounded py-1"
        >
          + 追加
        </button>
      </div>
    </div>
  );
}
