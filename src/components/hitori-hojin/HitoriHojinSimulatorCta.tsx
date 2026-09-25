'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/gtag';
import { SIMULATOR_CTA_LABEL } from '@/lib/ctaCopy';

// 一人法人LPの下部CTA（シミュレーター本体へのボタン）。page.tsxはサーバーコンポーネントのため、
// クリックイベントを送るボタンだけをクライアントコンポーネントに切り出している。
// サイト内リンクにはutmを付けず、クリックはGA4イベント hojin_lp_cta_click で計測する
// （utmを付けると、そのクリックの時点でGA4の流入元がutmの値に置き換わり、本来の集客経路が見えなくなるため。
// docs/fixes の internal-utm-to-ga4-event）。
export default function HitoriHojinSimulatorCta() {
  return (
    <Link
      href="/app"
      onClick={() => trackEvent('hojin_lp_cta_click', { location: 'bottom' })}
      className="inline-block bg-[#0F2A4A] text-white font-bold px-8 py-3 rounded hover:opacity-90 transition-opacity"
    >
      {SIMULATOR_CTA_LABEL}
    </Link>
  );
}
