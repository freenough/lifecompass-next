'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, Label, ResponsiveContainer } from 'recharts';
import { getAssetClassColor } from '@/lib/hojinAssetManagement/classColors';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import type { AssetHolding } from '@/lib/assetManagement/types';

// 個人資産管理ツールのAssetAllocationChart.tsx（ロック対象）のRecharts・ssr:false動的import
// パターン、MAX_SLICES畳み込みロジックをそのまま複製（8章：資産クラス軸で合算表示）。
const MAX_SLICES = 6;
const FOLD_BUCKET_LABEL = 'その他の資産クラス';
const FOLD_BUCKET_COLOR = '#c3c2b7';

interface HojinAssetAllocationChartProps {
  hojinHoldings: AssetHolding[];
  personalHoldings: AssetHolding[];
  /** 'personalOnly'なら個人資産のみ、'combined'なら法人保有資産も合算する（表示トグルに追従）。 */
  displayScope: 'personalOnly' | 'combined';
}

interface SliceDatum {
  key: string | null;
  name: string;
  value: number;
  color: string;
}

export default function HojinAssetAllocationChart({ hojinHoldings, personalHoldings, displayScope }: HojinAssetAllocationChartProps) {
  // 個人化想定比率は反映しない。実際の保有金額をそのまま合算する。
  // フェーズ1：/assetsは個人ツールが本体のため、'personalOnly'は個人資産のみを指す
  // （法人資産管理ツール単体だった頃の'hojin'（法人のみ）から意味が反転している）。
  const holdings: { assetClass: string; amount: number }[] =
    displayScope === 'combined' ? [...personalHoldings, ...hojinHoldings] : personalHoldings;

  const totals = new Map<string, number>();
  holdings.forEach((h) => {
    if (!h.amount) return;
    totals.set(h.assetClass, (totals.get(h.assetClass) ?? 0) + h.amount);
  });

  const sorted = Array.from(totals.entries())
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = sorted.slice(0, MAX_SLICES);
  const restTotal = sorted.slice(MAX_SLICES).reduce((s, [, amount]) => s + amount, 0);

  const data: SliceDatum[] = [
    ...top.map(([assetClass, value]) => ({
      key: assetClass,
      name: getAssetClassLabel(assetClass),
      value,
      color: getAssetClassColor(assetClass),
    })),
    ...(restTotal > 0 ? [{ key: null, name: FOLD_BUCKET_LABEL, value: restTotal, color: FOLD_BUCKET_COLOR }] : []),
  ];
  const grandTotal = data.reduce((s, d) => s + d.value, 0);

  if (grandTotal === 0) {
    return <p className="text-xs text-slate-400 py-8 text-center">資産クラスを入力すると内訳を表示します</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.key ?? '__fold__'} fill={d.color} />
            ))}
            {/* ドーナツ中央の合計表示。grandTotalはdisplayScopeに連動して再計算されるため、
                トグル切り替え時に扇形と中央表示が必ず同時に切り替わる（4.5節の要件）。 */}
            <Label
              position="center"
              content={({ viewBox }) => {
                const { x, y, width, height } = viewBox as { x: number; y: number; width: number; height: number };
                const cx = x + width / 2;
                const cy = y + height / 2;
                return (
                  <g>
                    <text x={cx} y={cy - 9} textAnchor="middle" fontSize={11} fill="#94a3b8">
                      合計
                    </text>
                    <text x={cx} y={cy + 13} textAnchor="middle" fontSize={22} fontWeight="bold" fill="#0f172a">
                      {grandTotal.toLocaleString()}
                      <tspan fontSize={13} fontWeight="normal">
                        万円
                      </tspan>
                    </text>
                  </g>
                );
              }}
            />
          </Pie>
          <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()}万円`, String(name)]} />
          <Legend itemSorter={null} />
        </PieChart>
      </ResponsiveContainer>

      <table className="w-full text-xs mt-2">
        <caption className="sr-only">資産クラス別内訳</caption>
        <thead>
          <tr className="text-slate-400">
            <th className="text-left font-normal">資産クラス</th>
            <th className="text-right font-normal">金額</th>
            <th className="text-right font-normal">割合</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key ?? '__fold__'} className="border-t border-slate-200">
              <td className="py-1">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: d.color }}
                  aria-hidden="true"
                />
                {d.name}
              </td>
              <td className="py-1 text-right">{d.value.toLocaleString()}万円</td>
              <td className="py-1 text-right">{((d.value / grandTotal) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
