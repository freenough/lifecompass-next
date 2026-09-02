'use client';

import { classBreakdown } from '@/lib/hojinAssetManagement/breakdown';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import { getAssetClassColor } from '@/lib/hojinAssetManagement/classColors';
import { findPersonalSnapshot, findHojinSnapshot, getMergedRecordDates } from '@/lib/hojinAssetManagement/personalHistory';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';
import type { HojinAssetSnapshot } from '@/lib/hojinAssetManagement/types';

interface HojinAssetAllocationChangeTableProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  snapshots: HojinAssetSnapshot[];
  displayScope: 'personalOnly' | 'combined';
  /**
   * 個人ストア自身の真の記録履歴。前回列の個人側内訳は、法人スナップショットが持つ
   * personalHoldings（記録タイミングによって歯抜けになりうる表示用の複製）ではなく、
   * こちらを該当年月で優先参照する（simplify_csv_scope_and_fix_graph_history_bug.md 1章）。
   */
  personalSnapshots: AssetSnapshot[];
}

// 個人資産管理ツールのAssetAllocationChangeTable.tsx（ロック対象）を複製し、6.3節のトグルに
// 追従して法人のみ／合算のいずれかで前回比を計算するように拡張（9章）。
export default function HojinAssetAllocationChangeTable({
  hojinHoldings,
  personalHoldings,
  snapshots,
  displayScope,
  personalSnapshots,
}: HojinAssetAllocationChangeTableProps) {
  // claude_instruction_fix_hojin_toggle_history_graph_bug.md：「前回」の年月は法人スナップショット
  // 単独ではなく、個人・法人の日付の和集合から求める（個人単独の記録月も「前回」の候補にする）。
  const recordDates = getMergedRecordDates(personalSnapshots, snapshots);
  const latestDate = recordDates.length > 0 ? recordDates[recordDates.length - 1] : null;
  if (!latestDate) return null;
  const lastHojinSnap = findHojinSnapshot(snapshots, latestDate);

  // 1章：前回の個人側holdingsは、個人ストア自身の真の記録履歴を該当年月で優先参照する
  // （無ければ法人スナップショットの表示用複製personalHoldingsへフォールバック）。
  const lastPersonalHoldings = findPersonalSnapshot(personalSnapshots, latestDate)?.holdings ?? lastHojinSnap?.personalHoldings ?? [];

  // フェーズ1：/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す。
  const currentHoldings = displayScope === 'combined' ? [...personalHoldings, ...hojinHoldings] : personalHoldings;
  const lastHoldings = displayScope === 'combined'
    ? [...lastPersonalHoldings, ...(lastHojinSnap?.hojinHoldings ?? [])]
    : lastPersonalHoldings;

  const currentBreakdown = classBreakdown(currentHoldings);
  const lastBreakdown = classBreakdown(lastHoldings);
  const allClasses = Array.from(new Set<string>([...currentBreakdown.keys(), ...lastBreakdown.keys()]))
    .sort((a, b) => (currentBreakdown.get(b) ?? 0) - (currentBreakdown.get(a) ?? 0));
  if (allClasses.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-600 mb-2">資産配分の変化（{latestDate}比）</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-400">
            <th className="text-left font-normal">資産クラス</th>
            <th className="text-right font-normal">前回</th>
            <th className="text-right font-normal">現在</th>
            <th className="text-right font-normal">変化</th>
          </tr>
        </thead>
        <tbody>
          {allClasses.map((cls) => {
            const before = lastBreakdown.get(cls) ?? 0;
            const after = currentBreakdown.get(cls) ?? 0;
            const delta = after - before;
            return (
              <tr key={cls} className="border-t border-slate-200">
                <td className="py-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: getAssetClassColor(cls) }}
                    aria-hidden="true"
                  />
                  {getAssetClassLabel(cls)}
                </td>
                <td className="py-1 text-right">{before.toFixed(1)}%</td>
                <td className="py-1 text-right">{after.toFixed(1)}%</td>
                <td className={`py-1 text-right ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pt
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
