'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Label, ResponsiveContainer } from 'recharts';
import { getAssetClassColor } from '@/lib/assetManagement/classColors';
import { getAssetClassLabel } from '@/lib/assetManagement/categories';
import { useCountUp } from '@/hooks/useCountUp';
import { DEMO_HOLDINGS, DEMO_HOLDINGS_TOTAL } from '@/lib/lp/demoHoldings';

interface SliceDatum {
  key: string;
  name: string;
  value: number;
  color: string;
}

// AssetAllocationChart.tsx（本体）は明細テーブルとセットで、テーブルだけを隠すpropsが
// ないため呼び出さない。色・ラベルの分類ロジック（getAssetClassColor/getAssetClassLabel）
// だけを本体と共有し、描画はLP専用に軽量に作り直す
// （claude_instruction_asset_card_redesign_unified.md「設計方針の確定理由」参照）。
function buildSlices(): SliceDatum[] {
  const totals = new Map<string, number>();
  DEMO_HOLDINGS.forEach((h) => totals.set(h.assetClass, (totals.get(h.assetClass) ?? 0) + h.amount));
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([assetClass, value]) => ({
      key: assetClass,
      name: getAssetClassLabel(assetClass),
      value,
      color: getAssetClassColor(assetClass),
    }));
}

export default function AssetBreakdownDonut() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  const slices = useMemo(buildSlices, []);

  // 画面内に入るまでPieChartをマウントしない。入った瞬間に初めてマウントすることで、
  // Rechartsのデフォルトのマウントアニメーション（扇形が開く動き）を自然に発火させる
  // （前回実装のAssetAllocationDemo.tsxと同じ方式）。
  useEffect(() => {
    const el = rootRef.current;
    if (!el || entered) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [entered]);

  const totalVal = useCountUp(entered ? DEMO_HOLDINGS_TOTAL : null, 1200, 0);

  return (
    <div ref={rootRef}>
      {entered ? (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={2}>
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
              {/* 本体AssetAllocationChart.tsxと同じ、Pieの実際の描画中心にSVGテキストを直接
                  置く方式（凡例の有無で中心がズレない）。LPカードの幅に収まるよう本体より
                  一回り小さいフォントサイズにする。 */}
              <Label
                position="center"
                content={({ viewBox }) => {
                  const { x, y, width, height } = viewBox as { x: number; y: number; width: number; height: number };
                  const cx = x + width / 2;
                  const cy = y + height / 2;
                  return (
                    <g>
                      <text x={cx} y={cy - 7} textAnchor="middle" fontSize={9} fill="#94a3b8">
                        合計
                      </text>
                      <text x={cx} y={cy + 11} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#0f172a">
                        {Math.round(totalVal).toLocaleString()}
                        <tspan fontSize={10} fontWeight="normal">万円</tspan>
                      </text>
                    </g>
                  );
                }}
              />
            </Pie>
            {/* 明細テーブルは実装しない。凡例は色チップ＋ラベルのみのシンプルな表示に留め、
                LPカードの幅に収まる小さめのフォントサイズにする（本体の12pxより小さい10px）。 */}
            <Legend itemSorter={null} wrapperStyle={{ fontSize: '10px', lineHeight: '14px' }} iconSize={8} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 180 }} aria-hidden="true" />
      )}
    </div>
  );
}
