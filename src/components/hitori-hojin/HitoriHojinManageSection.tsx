import Link from 'next/link';
import dynamic from 'next/dynamic';
import { IconBuildingBank, IconChartDonut, IconAdjustmentsHorizontal } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';
import { FREE_NO_SIGNUP_NOTE } from '@/lib/ctaCopy';
import Container from '@/components/layout/Container';

// 右側のカード本体はIntersectionObserver・アニメーションを使うため、資産シミュレーター側
// （AssetManagementPromoSection.tsx）と同じくssr:falseの動的importで読み込む。読み込み中は
// カード本体と同じ高さ（HojinCompositionDemo.tsx参照：162px）の枠を確保してレイアウトのずれを防ぐ。
const HojinCompositionDemo = dynamic(() => import('./HojinCompositionDemo'), {
  ssr: false,
  loading: () => <div className="h-[162px]" aria-hidden="true" />,
});

// 資産シミュレーター側の導線セクション（src/components/lp/AssetManagementPromoSection.tsx、
// ロック対象ではないが複製方針によりimportしない）と同じく、外枠（角丸・枠線）を付けずに
// Containerへ直接載せる（impl_hitori_hojin_lp_ui.md 5-2節）。独立したファイルとして実装する。
const FEATURES: { label: string; Icon: Icon }[] = [
  { label: '法人預金・証券口座など、法人特有の資産を記録', Icon: IconBuildingBank },
  { label: '個人資産と合わせて、資産全体の内訳を確認', Icon: IconChartDonut },
  { label: '将来の手取り目安を、自分で設定して試算', Icon: IconAdjustmentsHorizontal },
];

// 濃紺（CTAボタンと同色）。右側のカードの内訳バーは、デモデータ（demoHoldings.ts＋
// demoHojinHoldings.ts）を本物のcalcCompositionPercentages()で計算して描く（HojinCompositionDemo.tsx）。
const NAVY = '#0F2A4A';

export default function HitoriHojinManageSection() {
  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-col lg:flex-row lg:items-center gap-10">

          {/* 左：テキスト＋CTA */}
          <div className="flex-1 flex flex-col items-center text-center lg:items-start lg:text-left">
            {/* 大きさ・太さ・行間は本体LP（AssetManagementPromoSection.tsx）の「毎月の資産を、記録する。」と
                同じクラス。折り返す幅では「法人の資産も、／FIREの進捗に。」でだけ切れるよう、Heroのh1と同じ
                word-break: keep-all＋wbrにする（impl_hitori_hojin_lp_ui_followup.md 4節）。 */}
            <h2 className="text-[2rem] sm:text-5xl font-bold text-slate-900 text-balance [word-break:keep-all]">
              法人の資産も、<wbr />FIREの進捗に。
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
              法人に保有している資産を記録し、個人資産と合わせた内訳を確認できます。
            </p>

            <ul className="mt-6 flex flex-col gap-3 w-full max-w-sm">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <f.Icon size={22} className="text-slate-600 shrink-0" />
                  <span className="text-sm text-slate-600 text-left">{f.label}</span>
                </li>
              ))}
            </ul>

            {/* 法人資産管理ツールは個人の資産管理ツール（/assets）に統合済みのため、/hitori-hojin/assets
                （/assetsへのリダイレクトだけのページ）を経由せず直接リンクする。next/linkのままなので
                basePathが付き/asset-simulator/assetsになる（資産シミュレーター側への移動なので正しい）。 */}
            <Link
              href={ASSET_MANAGEMENT_PATH}
              className="mt-8 inline-block rounded px-8 py-4 text-base font-semibold text-white shadow transition-colors whitespace-nowrap"
              style={{ backgroundColor: NAVY }}
            >
              法人資産管理ツールを開く →
            </Link>
            <p className="mt-4 text-sm text-slate-400">{FREE_NO_SIGNUP_NOTE}</p>
          </div>

          {/* 右：個人＋法人の内訳バー＋合計金額（デモデータで本物の計算を動かす） */}
          <div className="w-full lg:w-[340px] lg:shrink-0">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold text-slate-500 mb-4">個人＋法人 合算</p>
              <HojinCompositionDemo />
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
