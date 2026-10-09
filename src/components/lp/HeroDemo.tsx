'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { simulate, analyze, runMC } from '@/lib';
import KpiCard from '@/components/simulator/KpiCard';
import { assetLongevityVariant, fireSafetyVariant } from '@/lib/kpi-thresholds';
import { useEqualHeight } from '@/hooks/useEqualHeight';
import { useCountUp } from '@/hooks/useCountUp';
import { DEMO_PROFILE, DEMO_EVENTS } from '@/lib/lp/demoProfile';
import type { YearSnap, MCPercentiles } from '@/lib/types';

// 計算前・チャート読み込み中の表示（従来の「計算中…」と同じ）。チャートと同じ縦横比の枠の中に置く。
function ChartPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-slate-300 text-sm">
      計算中…
    </div>
  );
}

// Rechartsの部分だけssr:falseで読み込む。このコンポーネント（外枠・KPI・チャートの枠）は
// サーバーでも描き、チャートが現れる前から高さを確保する（cls_and_320px_implement.md 単位3）。
const HeroDemoChart = dynamic(() => import('@/components/lp/HeroDemoChart'), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

// 狭幅（320〜400px程度、3列表示）でtruncateにより文字が欠けないよう、
// シミュレーター本体のKpiGridより短い表記にする（LP独自のラベルのため他画面には影響しない）。
const KPI_LABELS = ['FIRE達成', '資産寿命', 'MC破綻率'];

// 計算前（サーバーのHTML・計算中）のKPI行の高さを、計算後と同じにするための見えない複製の文言。
// 計算前は「—」の1行だが、計算後は狭い幅（400px程度未満）で「52歳で達成」などが2行になり、
// KPI行が約17.5px伸びて下の説明文・CTAを押し下げる（cls_and_320px_implement.md 単位3）。
// FIRE達成・資産寿命は乱数を使わない計算のため、描画前（サーバー側でも）に計算後と同じ文言を確定できる。
// MC破綻率は乱数を使うため、表示しうる最長の形（小数1桁の2桁%）で代用する（どの幅でも1行）。
const DEMO_STATIC = analyze(simulate(DEMO_PROFILE, DEMO_EVENTS, 'cash_first'), DEMO_PROFILE);
const KPI_SIZER_VALUES = [
  DEMO_STATIC.fA != null ? `${DEMO_STATIC.fA}歳で達成` : '未達成',
  DEMO_STATIC.dA == null ? '枯渇なし' : `${DEMO_STATIC.dA}歳で枯渇`,
  '00.0%',
];

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
  // チャートの元データ（行データへの組み立てはHeroDemoChart.tsx側で行う）
  const [chartInput, setChartInput] = useState<{ snaps: YearSnap[]; percentiles: MCPercentiles } | null>(null);
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

    setChartInput({ snaps, percentiles: mc.strategies.cash_first.percentiles });
  }, []);

  const fireAgeVal = useCountUp(fireAge, 1200, 0);
  const rateVal    = useCountUp(bankruptcyRate, 1500, 1);

  // 計算完了（チャートの元データが埋まった時点）まではneutral（灰）にし、シミュレーター実機（KpiGrid.tsx）
  // と同じ状態色ロジックを共通関数（kpi-thresholds.ts）経由で適用する
  // （FIRE達成＝minRatioベース3段階、資産寿命＝lifeEx-5年以内で黄の3段階、
  // MC破綻確率＝5%未満緑・5〜15%黄・15%以上赤）。
  const loaded = chartInput !== null && chartInput.percentiles.p50.length > 0;
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

  return (
    <div className="bg-white rounded shadow-2xl border border-slate-200 px-6 pt-6 pb-1 w-full">

      {/* KPI ブロック — シミュレーター実機と同じ白背景+状態色カード・フェードイン */}
      <div className="grid grid-cols-3 gap-2">
        {KPI_LABELS.map((label, i) => (
          <div
            key={label}
            ref={setKpiCardRef(i)}
            // 計算前だけ、計算後の文言の見えない複製を同じマス（grid-area 1/1）に重ね、高さを計算後とそろえる。
            // grid-cols-1（minmax(0,1fr)）で列幅を計算後と同じ幅に固定し、複製の文言の長さで横に広がらないようにする。
            // 計算後は複製と追加クラスを外し、従来と同じDOMに戻す。
            className={loaded ? undefined : 'grid grid-cols-1'}
            style={{
              opacity:   visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.4s ease ${i * 0.15}s, transform 0.4s ease ${i * 0.15}s`,
              ...(kpiCardMaxHeight ? { minHeight: kpiCardMaxHeight } : undefined),
            }}
          >
            <KpiCard label={label} value={kpiValues[i]} variant={kpiVariants[i]} size="sm" wrapperClassName={loaded ? undefined : '[grid-area:1/1]'} />
            {!loaded && (
              <div className="invisible [grid-area:1/1]" aria-hidden="true">
                <KpiCard label={label} value={KPI_SIZER_VALUES[i]} variant="neutral" size="sm" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MC ファンチャート — 左から描画アニメーション */}
      <div className={`mt-1 ${CHART_ASPECT_CLASS}`}>
        {loaded && chartInput ? (
          <HeroDemoChart snaps={chartInput.snaps} percentiles={chartInput.percentiles} />
        ) : (
          <ChartPlaceholder />
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-left mt-1">
        ※ サンプルデータによるシミュレーション結果
      </p>
    </div>
  );
}
