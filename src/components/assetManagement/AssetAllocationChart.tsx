'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAssetClassColor } from '@/lib/assetManagement/classColors';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import type { AssetHolding } from '@/lib/assetManagement/types';

// series-count ladder（5〜6件はソフトキャップ、7件以降はOtherへ畳み込み）に従い、
// 上位6件のみ個別スライスにし、残りは畳み込みバケットにまとめる（2.2節）。
// 畳み込みバケットの表示名は「その他の資産クラス」とし、実在の資産クラス「その他」
// （categories.tsのASSET_CLASSES）とは別物として扱う（同じ「その他」という文字列で
// 凡例に2行重複するのを防ぐため）。
const MAX_SLICES = 6;
const FOLD_BUCKET_LABEL = 'その他の資産クラス';
const FOLD_BUCKET_COLOR = '#c3c2b7';

interface AssetAllocationChartProps {
  holdings: AssetHolding[];
}

interface SliceDatum {
  key: string | null; // nullは畳み込みバケット（実在の資産クラスではない）
  name: string;
  value: number;
  color: string;
}

export default function AssetAllocationChart({ holdings }: AssetAllocationChartProps) {
  const totals = new Map<string, number>();
  holdings.forEach((h) => {
    if (!h.amount) return;
    totals.set(h.assetClass, (totals.get(h.assetClass) ?? 0) + h.amount);
  });

  // 2.4節：金額降順で統一（円グラフ・凡例・テーブルすべてこの順で描画する）。
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
          {/* 2.1節：円グラフ上のダイレクトラベル（割合%）は削除。凡例・テーブルで数値を担う。 */}
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.key ?? '__fold__'} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()}万円`, String(name)]} />
          {/* Recharts Legendはデフォルトでitemsorter='value'（ラベルのアルファベット順）
              になっており、これがテーブル（金額降順）と凡例の並びがズレる原因だった
              （2.4節）。itemSorter={null}でpayloadの並び順（=dataのpush順=金額降順）を
              そのまま使うようにする。 */}
          <Legend itemSorter={null} />
        </PieChart>
      </ResponsiveContainer>

      {/* アクセシビリティ用のテーブルビュー（色だけに頼らない）。2.3節：色ドットを追加。 */}
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
