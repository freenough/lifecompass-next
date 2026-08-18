'use client';

import type { AssetClassDef } from '@/lib/assetManagement/categories';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import type { AssetHolding } from '@/lib/assetManagement/types';
import { stripLeadingZero, clearZeroOrSelect } from '@/lib/numberInput';

// 既存AssetCard（PortfolioPanel.tsx、useSimulatorStoreに密結合のためロック対象・流用禁止）とは
// 独立した新規実装。更新はコールバックprops経由のみで、グローバルstoreを直接参照しない。
// カテゴリ単位の個別開閉は廃止（7.2節）。モバイルでの開閉は親（AssetManagementPage.tsx）が
// カード群全体をまとめて制御する「入力を編集」ボタン方式に統一したため、このカードは常時展開。

interface AssetHoldingCardProps {
  category: string;
  holdings: AssetHolding[];
  /** 空配列の場合は資産クラスのドロップダウンを表示しない（現金カード用）。 */
  allowedAssetClasses: AssetClassDef[];
  onAdd: (category: string) => void;
  onChange: (id: string, patch: Partial<AssetHolding>) => void;
  onDelete: (id: string) => void;
}

export default function AssetHoldingCard({
  category,
  holdings,
  allowedAssetClasses,
  onAdd,
  onChange,
  onDelete,
}: AssetHoldingCardProps) {
  const isCash = allowedAssetClasses.length === 0;
  const total = holdings.reduce((s, h) => s + (h.amount || 0), 0);

  return (
    <div className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{category}</span>
        <span className="text-xs text-slate-400">合計: {total.toLocaleString()}万円</span>
      </div>

      <div className="flex flex-col gap-2">
        {/* 1章バグ修正：flex-wrapだとサイドバーにスクロールバーが出て横幅が狭まった際、
            削除ボタンだけが次行に折り返されていた。flex-nowrap化した上で、資産クラスselect
            だけをmin-w-0で縮められるようにし、他の要素（保有者select・金額input・「万円」・
            削除ボタン）はshrink-0で幅を固定して折り返しの原因を作らないようにする。 */}
        {holdings.map((h) => (
          <div key={h.id} className="flex flex-nowrap items-center gap-1">
            <select
              value={h.owner}
              onChange={(e) => onChange(h.id, { owner: e.target.value as AssetHolding['owner'] })}
              className="shrink-0 w-16 text-xs border border-slate-300 rounded px-1 py-1"
            >
              <option value="personal">本人</option>
              <option value="personal_spouse">配偶者</option>
            </select>
            {!isCash && (
              <select
                value={h.assetClass}
                onChange={(e) => onChange(h.id, { assetClass: e.target.value })}
                className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-1 py-1"
              >
                {/* この制約導入前に保存された、現在のカテゴリでは選択不可の資産クラスも
                    表示だけは維持する（データを勝手に書き換えない、3.3節）。選択肢を
                    実際に変更した場合のみ、以降はallowedAssetClassesの制約に従う。 */}
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
