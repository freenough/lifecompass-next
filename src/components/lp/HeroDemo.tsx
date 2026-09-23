'use client';

import { useEffect, useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';
import { simulate, analyze, runMC } from '@/lib';
import KpiCard from '@/components/simulator/KpiCard';
import { formatYen, addFireLines, FireLines, EventLines } from '@/components/simulator/AssetChart';
import { assetLongevityVariant, fireSafetyVariant } from '@/lib/kpi-thresholds';
import { useEqualHeight } from '@/hooks/useEqualHeight';
import { useCountUp } from '@/hooks/useCountUp';
import { DEMO_PROFILE, DEMO_EVENTS } from '@/lib/lp/demoProfile';

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

// 狭幅（320〜400px程度、3列表示）でtruncateにより文字が欠けないよう、
// シミュレーター本体のKpiGridより短い表記にする（LP独自のラベルのため他画面には影響しない）。
const KPI_LABELS = ['FIRE達成', '資産寿命', 'MC破綻率'];

// チャートエリアの縦幅はaspect-ratioで幅から算出する(固定pxではない)。
// モバイル: aspect-[277/220]（実測チャート幅277pxを基準に約220px相当）。
// デスクトップ(lg:): aspect-[470/300]（実測チャート幅470pxを基準に、従来のCHART_HEIGHT=300pxと
// 同じ高さを維持）。max-h-[300px]は640〜1023px(1カラムのままaspect-*が適用され続ける範囲)で
// 幅が広がるにつれ高さが際限なく伸びるのを防ぐ安全弁（lg:未満は横幅がw-fullで最大1023pxまで
// 伸びうるため、aspect比だけだとlg直前で700px超まで伸びてからlg:1024pxで一気に300pxへ落ちる
// 不自然なジャンプが生じる。300pxで頭打ちにすることでlg:のaspect-[470/300](=300px)へ
// 連続的につながる）。詳細はimplementation_hero_spacing_chart_aspect_tool_section.md参照。
const CHART_ASPECT_CLASS = 'aspect-[277/220] max-h-[300px] lg:aspect-[470/300] lg:max-h-none';

export default function HeroDemo() {
  const [fireAge, setFireAge] = useState<number | null>(null);
  const [minRatio, setMinRatio] = useState<number | null>(null);
  const [dA, setDA] = useState<number | null>(null);
  const [bankruptcyRate, setBankruptcyRate] = useState<number | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [visible, setVisible] = useState(false);

  // フェードイン用：マウント100ms後にtrue
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const snaps = simulate(DEMO_PROFILE, DEMO_EVENTS, 'cash_first');
    const a = analyze(snaps, DEMO_PROFILE);
    setFireAge(a.fA);
    setMinRatio(a.minRatio);
    setDA(a.dA);

    const mc = runMC(DEMO_PROFILE, DEMO_EVENTS, ['cash_first'], 1000);
    const rate = mc.strategies.cash_first.bankruptcyRate;
    setBankruptcyRate(Math.round(rate * 10) / 10);

    const pct = mc.strategies.cash_first.percentiles;
    const rows: ChartRow[] = pct.p50.map((p50val, i) => {
      const row: ChartRow = {
        age: DEMO_PROFILE.curAge + i,
        p10: Math.max(0, Math.round(pct.p10[i])),
        p90: Math.max(0, Math.round(pct.p90[i])),
        中央値: Math.max(0, Math.round(p50val)),
      };
      if (snaps[i]) addFireLines(row, snaps[i]);
      return row;
    });
    setChartData(rows);
  }, []);

  const fireAgeVal = useCountUp(fireAge, 1200, 0);
  const rateVal    = useCountUp(bankruptcyRate, 1500, 1);

  // 計算完了（chartDataが埋まった時点）まではneutral（灰）にし、シミュレーター実機（KpiGrid.tsx）
  // と同じ状態色ロジックを共通関数（kpi-thresholds.ts）経由で適用する
  // （FIRE達成＝minRatioベース3段階、資産寿命＝lifeEx-5年以内で黄の3段階、
  // MC破綻確率＝5%未満緑・5〜15%黄・15%以上赤）。
  const loaded = chartData.length > 0;
  type Variant = 'good' | 'warn' | 'danger' | 'neutral';
  const kpiVariants: Variant[] = [
    !loaded ? 'neutral' : fireSafetyVariant(minRatio),
    !loaded ? 'neutral' : assetLongevityVariant(dA, DEMO_PROFILE.lifeEx),
    !loaded || bankruptcyRate == null ? 'neutral' : (bankruptcyRate < 5 ? 'good' : bankruptcyRate < 15 ? 'warn' : 'danger'),
  ];

  const kpiValues = [
    !loaded ? '—' : (fireAge != null ? `${Math.round(fireAgeVal)}歳で達成` : '未達成'),
    !loaded ? '—' : (dA == null ? '枯渇なし' : `${dA}歳で枯渇`),
    bankruptcyRate === null ? '—' : `${rateVal.toFixed(1)}%`,
  ];

  // LPは初見ユーザー向けの説得材料であり、StickyKpiBar.tsx（操作中ユーザー向け）と異なり
  // 専門的な補足情報（充足率%）は不要と判断し削除した（hero_demo_remove_subtext）。
  // StickyKpiBar.tsx側のサブテキストはそのまま維持、変更対象はHeroDemo.tsxのみ。

  // KPIカード3枚の高さ統一：見出しのみになった現在も、文字数差で高さが揺れないよう
  // KpiGrid.tsx向けに作成したuseEqualHeightフックをそのまま残す（hero_demo_kpi_layout_fix）。
  const { setRef: setKpiCardRef, maxHeight: kpiCardMaxHeight } = useEqualHeight(3);

  // Y軸目盛り：0/中間/最大の3段階のみ（LPとしての簡潔さを優先し、実機のような細かい目盛りは付けない）
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(r => r.p90)) : 0;
  const yMax = Math.max(5000, Math.ceil(maxVal / 5000) * 5000);
  const yTicks = [0, Math.round(yMax / 2), yMax];

  return (
    <div className="bg-white rounded shadow-2xl border border-slate-200 px-6 pt-6 pb-1 w-full">

      {/* KPI ブロック — シミュレーター実機と同じ白背景+状態色カード・フェードイン */}
      <div className="grid grid-cols-3 gap-2">
        {KPI_LABELS.map((label, i) => (
          <div
            key={label}
            ref={setKpiCardRef(i)}
            style={{
              opacity:   visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.4s ease ${i * 0.15}s, transform 0.4s ease ${i * 0.15}s`,
              ...(kpiCardMaxHeight ? { minHeight: kpiCardMaxHeight } : undefined),
            }}
          >
            <KpiCard label={label} value={kpiValues[i]} variant={kpiVariants[i]} size="sm" />
          </div>
        ))}
      </div>

      {/* MC ファンチャート — 左から描画アニメーション */}
      <div className={`mt-1 ${CHART_ASPECT_CLASS}`}>
        {chartData.length > 0 ? (
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
        ) : (
          <div className="h-full flex items-center justify-center text-slate-300 text-sm">
            計算中…
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-left mt-1">
        ※ サンプルデータによるシミュレーション結果
      </p>
    </div>
  );
}
