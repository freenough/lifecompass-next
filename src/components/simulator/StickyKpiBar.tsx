'use client';

import KpiCard from '@/components/simulator/KpiCard';

interface StickyKpiBarProps {
  visible: boolean;
  fA: number | null;
  dA: number | null;
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
export default function StickyKpiBar({ visible, fA, dA, bankruptcyRate }: StickyKpiBarProps) {
  if (!visible) return null;

  const fireAchieved = fA != null;
  const leftCard: { label: string; value: string; variant: Variant } = {
    label: 'FIRE達成',
    value: fireAchieved ? `${fA}歳` : '未達成',
    variant: fireAchieved ? 'good' : 'warn',
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
        // KpiGrid.tsxの資産寿命カードと同じ判定（枯渇なし=緑／枯渇あり=赤）
        variant: dA == null ? 'good' : 'danger',
      };

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label={leftCard.label} value={leftCard.value} variant={leftCard.variant} />
        <KpiCard label={rightCard.label} value={rightCard.value} variant={rightCard.variant} />
      </div>
    </div>
  );
}
