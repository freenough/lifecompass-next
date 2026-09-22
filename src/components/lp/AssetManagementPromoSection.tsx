import Link from 'next/link';
import dynamic from 'next/dynamic';
import { IconChartDonut, IconTarget, IconTrendingUp } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';
import Container from '@/components/layout/Container';

// Rechartsコンポーネントは必ずssr:falseの動的importで読み込む（ResponsiveContainerがDOM
// 計測に依存するため。HeroDemo.tsx/src/app/page.tsxの既存パターンを踏襲）。
// AssetAllocationDemo（本体AssetAllocationChart.tsxを直接呼ぶ版）は今回不使用（明細テーブルを
// 隠せないため）。ファイルとしては削除せず残置し、今後別の用途で使う可能性に備える
// （claude_instruction_asset_card_redesign_unified.md参照）。
const AssetProgressBadges = dynamic(() => import('./AssetProgressBadges'), { ssr: false });
const AssetBreakdownDonut = dynamic(() => import('./AssetBreakdownDonut'), { ssr: false });

const features: { label: string; Icon: Icon }[] = [
  { label: 'カテゴリ別に資産を入力するだけ', Icon: IconChartDonut },
  { label: '目標資産との差分・進捗率を表示', Icon: IconTarget },
  { label: '前回記録との増減がひと目でわかる', Icon: IconTrendingUp },
];

export default function AssetManagementPromoSection() {
  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">

          {/* 左：テキスト＋CTA。lg:max-w-[620px]は見出し「毎月の資産を、記録する。」が
              1行に収まる幅を確保しつつ、右カードとの視覚ボリュームのバランスを取るための上限
              （instruction_lp_container_width_and_block_frame.md 追加対応4節）。 */}
          <div className="flex-1 lg:max-w-[620px] flex flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="text-[2rem] sm:text-5xl font-bold text-slate-900 text-balance">
              毎月の資産を、記録する。
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
              シミュレーションで描いた未来と、実際の資産を突き合わせる。目標との差分がひと目でわかります。
            </p>

            <ul className="mt-6 flex flex-col gap-3 w-full max-w-sm">
              {features.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <f.Icon size={22} className="text-slate-600 shrink-0" />
                  <span className="text-sm text-slate-600 text-left">{f.label}</span>
                </li>
              ))}
            </ul>

            <Link
              href={ASSET_MANAGEMENT_PATH}
              className="mt-8 inline-block rounded px-8 py-4 text-base font-semibold text-white shadow transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: '#334155' }}
            >
              資産管理ツールを開く →
            </Link>
            <p className="mt-4 text-sm text-slate-400">無料・登録不要・データは端末内に保存</p>
          </div>

          {/* 右：ミニダッシュボード。ヒーロー（HeroDemo.tsx）と同じ「上にKPIバッジ3枠、
              下にグラフ」構成。KPI3枠は資産管理ツール本体の「FIRE進捗」ブロックと同じ情報
              構成（目標資産額／目標までの進捗／前回記録比）を、ヒーローのバッジと同じ寸法感で
              実装したもの。ドーナツは本体AssetAllocationChart.tsxを直接呼ばず、色・ラベルの
              分類ロジックだけ共有するLP専用の軽量実装（AssetBreakdownDonut.tsx、明細テーブルなし）。
              詳細はclaude_instruction_asset_card_redesign_unified.md参照。 */}
          <div className="w-full lg:w-[480px] lg:shrink-0">
            <div className="rounded border border-slate-200 bg-white p-6">
              <AssetProgressBadges />

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-2">資産の内訳</p>
                <AssetBreakdownDonut />
              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
