'use client';

import type { AssetHolding } from '@/lib/assetManagement/types';
import { calcCompositionPercentages } from '@/lib/hojinAssetManagement/compositionBar';

interface HojinAssetCompositionBarProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  displayScope: 'personalOnly' | 'combined';
}

// instruction_asset_management_page_layout_review.md 0.1節：HojinAssetProgressPanel.tsxから
// 分離した「個人資産＋法人保有資産」の内訳バー（「今の資産構成」グループの一部）。
// 0.3節：法人保有資産の行から個人化想定額の括弧書きを削除（その数字は「法人資産を個人化した
// 場合」セクションで初めて説明されるため、ここで結論だけ先出しすると順序が矛盾する）。
// 0.4節：このバーは目標資産額に対する進捗ではなく、個人資産＋法人保有資産の合計を100%とした
// 内訳のみを示す（FIRE進捗カードの「目標までの進捗」が個人資産のみを基準にすると明記している
// こととの矛盾を解消するため、目標資産額マーカー・legendは表示しない）。
export default function HojinAssetCompositionBar({ hojinHoldings, personalHoldings, displayScope }: HojinAssetCompositionBarProps) {
  const hojinTotal = hojinHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  const personalTotal = personalHoldings.reduce((s, h) => s + (h.amount || 0), 0);
  // 見出し右側の合計額は、資産推移・資産クラス内訳等と同じdisplayScope連動の合計
  // （personalOnly時は個人資産のみ）。バー本体（内訳の割合）自体はdisplayScopeに関わらず
  // 常に個人・法人の両方の内訳を示す（従来の挙動を維持）。
  const currentScopedTotal = displayScope === 'combined' ? personalTotal + hojinTotal : personalTotal;

  const { personalPct, hojinPct } = calcCompositionPercentages(personalTotal, hojinTotal);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">個人資産＋法人保有資産</h3>
        <span className="text-sm font-bold text-slate-800">合計 {currentScopedTotal.toLocaleString()}万円</span>
      </div>
      <div className="relative w-full h-6 rounded-full bg-slate-100 overflow-hidden flex">
        <div style={{ width: `${personalPct}%`, backgroundColor: '#2a78d6' }} aria-hidden="true" />
        <div
          style={{
            width: `${hojinPct}%`,
            backgroundImage: 'repeating-linear-gradient(45deg, #6b4423, #6b4423 4px, transparent 4px, transparent 8px)',
            backgroundColor: 'rgba(107,68,35,0.25)',
          }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 flex flex-col gap-1 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#2a78d6' }} aria-hidden="true" />
          個人資産: {personalTotal.toLocaleString()}万円
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm shrink-0"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #6b4423, #6b4423 2px, transparent 2px, transparent 4px)',
              backgroundColor: 'rgba(107,68,35,0.25)',
            }}
            aria-hidden="true"
          />
          法人保有資産: {hojinTotal.toLocaleString()}万円
        </div>
      </div>
    </div>
  );
}
