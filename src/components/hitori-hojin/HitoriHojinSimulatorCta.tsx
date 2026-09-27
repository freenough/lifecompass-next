'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/gtag';
import { SIMULATOR_CTA_LABEL } from '@/lib/ctaCopy';

interface HitoriHojinSimulatorCtaProps {
  // GA4イベントのlocation。Hero（'hero'）と下部CTA（'bottom'）を区別する。
  location?: 'hero' | 'bottom';
  // ボタンの見た目。既定は下部CTAの見た目（Heroは資産シミュレーターLPのCTAボタンと同じ見た目を渡す）。
  className?: string;
}

const BOTTOM_CTA_CLASS = 'inline-block bg-[#0F2A4A] text-white font-bold px-8 py-3 rounded hover:opacity-90 transition-opacity';

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
