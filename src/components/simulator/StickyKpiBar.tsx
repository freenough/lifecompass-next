'use client';

import KpiCard from '@/components/simulator/KpiCard';
import { assetLongevityVariant, fireSafetyVariant } from '@/lib/kpi-thresholds';

interface StickyKpiBarProps {
  visible: boolean;
  fA: number | null;
  dA: number | null;
  lifeEx: number;
  // 退職後/FIRE達成後最低充足率（KpiGrid.tsxの「FIRE達成」カードと同じ値）。
  // 色分けの判定に使うほか、FIRE達成カードのサブテキスト（`{%}`部分）にもそのまま表示する。
  minRatio: number | null;
  bankruptcyRate?: number | null;
}

type Variant = 'good' | 'warn' | 'danger' | 'neutral';

/**
 * モバイル用のスティッキーKPIバー。「入力フォームが画面内に見えている かつ KpiGridが
 * 画面内に見えていない」間だけ画面下部に表示する（判定はpage.tsx側）。
 * 新規の計算は行わず、analysis（fA/dA）とmcResult（bankruptcyRate）の既存値をそのまま表示する。
 * KpiGrid.tsx本体と同じ`KpiCard`コンポーネントを再利用し、配色・角丸等の見た目を統一する。
 * KpiGrid.tsx側の2列/3列レスポンシブ制御とは独立させ、画面幅によらず常にgrid-cols-2固定
 * （2枚を均等幅で表示）。lg:hiddenで、入力フォームとKPI/グラフが横並びになるbreakpoint
 * （page.tsxのlg:flex-row）と同じTailwindのlgを再利用し、横並びレイアウトでは常に非表示にする
 * （新規の数値は定義しない）。
 *
 * 右スロットの判定は「MCタブが選択されているか（mode）」ではなく「実際にMC計算結果が
 * 存在するか（bankruptcyRateがnull/undefinedでないか）」を基準にする。mcResultは入力を
 * 変更すると自動的にnullへリセットされるため、この基準の方が「タブは選んだがまだ
 * 実行していない」「実行後に入力を変えた」状態を正しく資産寿命表示に倒せる。
 */
export default function StickyKpiBar({ visible, fA, dA, lifeEx, minRatio, bankruptcyRate }: StickyKpiBarProps) {
  if (!visible) return null;

  const fireAchieved = fA != null;
  // KpiGrid.tsxと同じminRatio（既存のanalyze.ts算出値）でサブテキストのみ追加する。
  // 改善案文言(findImprovementThresholds())はKpiGrid.tsx本体のみに表示し、ここには含めない
  // （sticky_kpi_bar_subtext：省スペースUIでの可変長テキストによるレイアウト崩れを避けるため）。
  const minRatioRounded = minRatio != null ? Math.round(minRatio) : null;
  const minRatioLabel = fireAchieved ? 'FIRE達成後最低充足率' : '退職後最低充足率';
  const leftCard: { label: string; value: string; sub?: string; variant: Variant } = {
    label: 'FIRE達成',
    value: fireAchieved ? `${fA}歳で達成` : '未達成',
    sub: minRatioRounded != null ? `${minRatioLabel} ${minRatioRounded}%` : undefined,
    // KpiGrid.tsxの「FIRE達成」カードと同じ共通関数（fireSafetyVariant）を参照
    variant: fireSafetyVariant(minRatio),
  };

  const rightCard: { label: string; value: string; variant: Variant } = bankruptcyRate != null
    ? {
        label: 'MC破綻率',
        value: `${bankruptcyRate.toFixed(1)}%`,
        // KpiGrid.tsxのMC破綻確率カードと同じ閾値（5%未満=緑／5〜15%=黄／15%以上=赤）
        variant: bankruptcyRate < 5 ? 'good' : bankruptcyRate < 15 ? 'warn' : 'danger',
      }
    : {
        label: '資産寿命',
        value: dA == null ? '枯渇なし' : `${dA}歳で枯渇`,
        // KpiGrid.tsxの資産寿命カードと同じ共通関数（assetLongevityVariant）を参照
        variant: assetLongevityVariant(dA, lifeEx),
      };

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label={leftCard.label} value={leftCard.value} sub={leftCard.sub} variant={leftCard.variant} />
        <KpiCard label={rightCard.label} value={rightCard.value} variant={rightCard.variant} />
      </div>
    </div>
  );
}
