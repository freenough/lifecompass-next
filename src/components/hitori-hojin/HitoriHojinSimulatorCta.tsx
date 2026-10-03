'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/gtag';
import { SIMULATOR_CTA_LABEL } from '@/lib/ctaCopy';
import { CTA_BUTTON_CLASS } from '@/lib/ctaButtonClass';

interface HitoriHojinSimulatorCtaProps {
  // GA4イベントのlocation。Hero（'hero'）と下部CTA（'bottom'）を区別する。
  location?: 'hero' | 'bottom';
  // ボタンの見た目。既定は一人法人LPのCTA共通クラス（Heroはこれに余白mt-6を足して渡す）。
  className?: string;
}

// 下部CTAの見た目。Hero・法人資産管理ツールのボタンと同じ共通クラス（色#334155）。
const BOTTOM_CTA_CLASS = CTA_BUTTON_CLASS;

// 一人法人LPのシミュレーター本体へのボタン（Hero・下部CTA）。page.tsxはサーバーコンポーネントのため、
// クリックイベントを送るボタンだけをクライアントコンポーネントに切り出している。
// サイト内リンクにはutmを付けず、クリックはGA4イベント hojin_lp_cta_click で計測する
// （utmを付けると、そのクリックの時点でGA4の流入元がutmの値に置き換わり、本来の集客経路が見えなくなるため。
// docs/fixes の internal-utm-to-ga4-event）。
export default function HitoriHojinSimulatorCta({ location = 'bottom', className = BOTTOM_CTA_CLASS }: HitoriHojinSimulatorCtaProps) {
  return (
    <Link
      href="/app"
      onClick={() => trackEvent('hojin_lp_cta_click', { location })}
      className={className}
    >
      {SIMULATOR_CTA_LABEL}
    </Link>
  );
}
