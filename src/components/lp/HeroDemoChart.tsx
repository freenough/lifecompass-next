'use client';

import { useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';
import { formatYen, addFireLines, FireLines, EventLines } from '@/components/simulator/AssetChart';
import type { YearSnap, MCPercentiles } from '@/lib/types';
import { DEMO_PROFILE } from '@/lib/lp/demoProfile';

// LP Heroのライブデモ（HeroDemo.tsx）のうち、Rechartsで描くMCファンチャート部分だけを切り出したもの。
// Rechartsは必ずssr:falseの動的importで読み込む（ResponsiveContainerがDOM計測に依存するため）。
// HeroDemo.tsx本体（外枠・KPI・チャートと同じ縦横比の枠）はサーバーでも描き、チャートが現れる前から
// 枠の高さを確保してレイアウトのずれ（CLS）を防ぐ（cls_and_320px_implement.md 単位3）。
// チャート用の行データ（addFireLines）もここで組み立てる。HeroDemo.tsxがAssetChart.tsx（Recharts）を
// importすると、Rechartsが初回読み込みのJSに含まれてしまうため。

interface ChartRow {
  age: number;
  中央値: number;
  p10: number;
  p90: number;
  [key: string]: number;
}

/**
 * X軸の目盛りをcurAge起点の10歳刻みで生成し、余命年齢(lifeEx)を跨がないよう
 * 最後だけ端数の刻みでlifeEx自体を必ず含める（例: curAge=35, lifeEx=90 →
 * [35,45,55,65,75,90]）。
 * 「次の10歳刻みを置くとlifeExまでの残り区間が10年未満になる」場合はその
 * 10歳刻みを置かず、直接lifeExへ繋げる。これにより最後の区間が10年区間の
 * 半分（5年）ぎりぎりになって隣の目盛りラベルと詰まって見えるのを避ける
 * （例: 85は置かず75の次を90にする→最後の区間は15年になる）。
 * Rechartsの自動間引き（39・44・49…のような中途半端な目盛り）を避けるため、
 * カテゴリ軸の設定自体は変えずticksだけ明示的に渡す。
 */
function buildXTicks(curAge: number, lifeEx: number): number[] {
  const ticks: number[] = [curAge];
  let age = curAge + 10;
  while (age + 10 <= lifeEx) {
    ticks.push(age);
    age += 10;
  }
  if (ticks[ticks.length - 1] !== lifeEx) {
    ticks.push(lifeEx);
  }
  return ticks;
}

interface XAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
}

/**
 * 目盛り位置（データ点・グリッド線の座標）は一切動かさず、ラベルの描画だけを調整する。
 * 最後の目盛り(lifeEx＝90歳)はtext-anchorをmiddleからendに変え、文字を左方向へ伸ばして
 * 描画することで、右端でのはみ出し・欠けを防ぐ。他の目盛りは従来通りmiddleのまま。
 */
function XAxisTick({ x, y, payload }: XAxisTickProps) {
  if (x == null || y == null || !payload) return null;
  const isLast = payload.value === DEMO_PROFILE.lifeEx;
  return (
    <text x={x} y={y + 12} textAnchor={isLast ? 'end' : 'middle'} fontSize={11} fill="#666">
      {payload.value}歳
    </text>
  );
}

export default function HeroDemoChart({ snaps, percentiles }: { snaps: YearSnap[]; percentiles: MCPercentiles }) {
  const chartData = useMemo(() => percentiles.p50.map((p50val, i) => {
    const row: ChartRow = {
      age: DEMO_PROFILE.curAge + i,
      p10: Math.max(0, Math.round(percentiles.p10[i])),
      p90: Math.max(0, Math.round(percentiles.p90[i])),
      中央値: Math.max(0, Math.round(p50val)),
    };
    if (snaps[i]) addFireLines(row, snaps[i]);
    return row;
  }), [snaps, percentiles]);

  // Y軸目盛り：0/中間/最大の3段階のみ（LPとしての簡潔さを優先し、実機のような細かい目盛りは付けない）
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(r => r.p90)) : 0;
  const yMax = Math.max(5000, Math.ceil(maxVal / 5000) * 5000);
  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="age"
          ticks={buildXTicks(DEMO_PROFILE.curAge, DEMO_PROFILE.lifeEx)}
          interval={0}
          tick={<XAxisTick />}
        />
        <YAxis
          domain={[0, yMax]}
          ticks={yTicks}
          width={36}
          tick={{ fontSize: 11 }}
          tickFormatter={formatYen}
        />
        <Legend wrapperStyle={{ fontSize: '12px', whiteSpace: 'nowrap', overflowX: 'auto', paddingTop: '4px' }} />
        {/* 退職の1本のみ表示（年金開始・配偶者マーカーはLPでは情報過多のため非表示） */}
        <EventLines retAge={DEMO_PROFILE.retAge} penAge={-999} spRetAgeMain={null} spPenAgeMain={null} />
        <FireLines />
        {/* p90（薄青、実機の総資産推移MC表示と同一の色・不透明度） */}
        <Area
          type="monotone"
          dataKey="p90"
          fill="#bfdbfe"
          stroke="#93c5fd"
          fillOpacity={0.4}
          name="p90"
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
        {/* p10（白塗りで下側を覆い、p10〜p90の帯だけを見せる） */}
        <Area
          type="monotone"
          dataKey="p10"
          fill="#ffffff"
          stroke="#93c5fd"
          fillOpacity={1}
          name="p10"
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
        {/* 中央値ライン（青） */}
        <Line
          type="monotone"
          dataKey="中央値"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
