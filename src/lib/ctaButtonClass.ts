// 一人法人LPのCTAボタン（Hero・法人資産管理ツール・最下部）の共通クラス（fix_cta_button_unify.md）。
// 寸法・文字・影・ホバーはHeroのボタン（資産シミュレーターLPのCTAと同じ見た目）に合わせ、色は#334155。
// 最小幅はfreenough-main（TOP）のボタンと同じ値（304px。本文が狭い幅では本文幅が上限）。
// 余白（mt-*）は文脈ごとに違うため含めず、呼び出し側で足す。
// 'use client'のファイルに置くと、サーバーコンポーネントからimportしたときに文字列ではなく
// クライアント参照になるため、通常のtsファイルに置いている。
// 360px以下は左右余白をpx-6にする。「法人資産管理ツールを開く →」が文言とpx-8で約276pxあり、
// 320px幅の本文（272px）を超えるため（max-[361px]:はTailwind v4で「361px未満」。TOPのCTAと同じ境界。
// cls_and_320px_implement.md 単位2）。
export const CTA_BUTTON_CLASS =
  'inline-block min-w-[min(19rem,100%)] rounded bg-[#334155] px-8 max-[361px]:px-6 py-4 text-center text-base font-semibold text-white shadow transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg';
