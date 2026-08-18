'use client';

import { classBreakdown } from '@/lib/assetManagement/breakdown';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import { getAssetClassColor } from '@/lib/assetManagement/classColors';
import type { AssetHolding, AssetSnapshot } from '@/lib/assetManagement/types';

interface AssetAllocationChangeTableProps {
  holdings: AssetHolding[];
  snapshots: AssetSnapshot[];
}

export default function AssetAllocationChangeTable({ holdings, snapshots }: AssetAllocationChangeTableProps) {
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  if (!latest) return null;

  const currentBreakdown = classBreakdown(holdings);
  const lastBreakdown = classBreakdown(latest.holdings);
  const allClasses = Array.from(new Set<string>([...currentBreakdown.keys(), ...lastBreakdown.keys()]))
    .sort((a, b) => (currentBreakdown.get(b) ?? 0) - (currentBreakdown.get(a) ?? 0));
  if (allClasses.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-600 mb-2">資産配分の変化（{latest.date}比）</p>
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
