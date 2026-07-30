'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import { calcChildYearlyCosts, type ChildInput } from '@/lib/educationCostCalc';

interface EducationCostChartProps {
  kids: ChildInput[];
}

/** FREENOUGHブランドの青・紺・薄いグレー系（既存ツールのグラフ配色とは別軸。Spec Phase2-4参照）。 */
const CHILD_COLORS = ['#5DA9E0', '#173F5F', '#CBD5E1'];
const OVERLAP_FILL = 'rgba(23,63,95,0.10)';

function toMan(yen: number): number {
  return Math.round(yen / 10_000);
}

/** 連続するindexをまとめて[start, end]の区間配列にする（ReferenceAreaを区間ごとに1つ描画するため）。 */
function toRuns(indices: number[]): [number, number][] {
  const runs: [number, number][] = [];
  for (const i of indices) {
    const last = runs[runs.length - 1];
    if (last && last[1] === i - 1) {
      last[1] = i;
    } else {
      runs.push([i, i]);
    }
  }
  return runs;
}

export default function EducationCostChart({ kids }: EducationCostChartProps) {
  if (kids.length === 0) return null;

  const perChildYearly = kids.map(c => calcChildYearlyCosts(c));
  const maxLength = Math.max(...perChildYearly.map(y => y.length));

  const data = Array.from({ length: maxLength }, (_, yearOffset) => {
    const row: Record<string, number> = { yearOffset };
    perChildYearly.forEach((yearly, i) => {
      row[`child${i}`] = toMan(yearly[yearOffset] ?? 0);
    });
    return row;
  });

  // 「2人以上の子供で費用が発生している年」を実データから動的に検出する
  // （ハードコードせず、各子供の年次配列の長さから毎回算出。Spec Phase2-4）。
  const overlapIndices = kids.length >= 2
    ? Array.from({ length: maxLength }, (_, i) => i).filter(
        i => perChildYearly.filter(yearly => i < yearly.length).length >= 2
      )
    : [];
  const overlapRuns = toRuns(overlapIndices);

  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="10%" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="yearOffset" tick={{ fontSize: 10 }} tickFormatter={v => `${v}年後`} interval="preserveStartEnd" />
          <YAxis width={48} tick={{ fontSize: 10 }} tickFormatter={v => `${v}万円`} />
          <Tooltip
            labelFormatter={l => `${l}年後`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => {
              const i = Number(String(name).replace('child', ''));
              return [`${Number(value).toLocaleString()}万円`, `子供${i + 1}`];
            }}
          />
          {overlapRuns.map(([start, end], i) => (
            <ReferenceArea key={i} x1={start} x2={end} fill={OVERLAP_FILL} strokeOpacity={0} />
          ))}
          {perChildYearly.map((_, i) => (
            <Bar key={i} dataKey={`child${i}`} stackId="total" fill={CHILD_COLORS[i]} radius={i === perChildYearly.length - 1 ? [2, 2, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* 独自実装の凡例（Rechartsデフォルト凡例は使わない。Spec Phase2-4） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-xs text-slate-500">
        {perChildYearly.map((_, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHILD_COLORS[i] }} />
            子供{i + 1}
          </span>
        ))}
        {overlapRuns.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#173F5F', opacity: 0.15 }} />
            複数の子供の教育費が重なる期間
          </span>
        )}
      </div>
    </div>
  );
}
