'use client';

import { useSyncExternalStore } from 'react';
import Script from 'next/script';
import { ANALYTICS_ALLOWED_HOSTS, GA_MEASUREMENT_ID, IS_PRODUCTION_BUILD } from '@/lib/analytics';

// ホスト名はページ表示中に変わらないため、購読は何もしない
const subscribe = () => () => {};
const isAllowedHost = () => ANALYTICS_ALLOWED_HOSTS.includes(window.location.hostname);
// サーバー（とハイドレーション時）は常にfalse。ブラウザでだけホスト名を判定する
const serverSnapshot = () => false;

// GA4（gtag）は「本番ビルド」かつ「本番ドメインで開いている」ときだけ読み込む。
// ホスト名はブラウザでしか分からないため、クライアント側で判定してからScriptを出力する
// （useEffect内のsetStateを避け、freenough-mainと同じ実装にそろえている）。
// 読み込まない場合はwindow.gtagが定義されないので、trackEvent（src/lib/gtag.ts）は何もせずに終わる。
export default function AnalyticsScripts() {
  const allowed = useSyncExternalStore(subscribe, isAllowedHost, serverSnapshot);

  if (!IS_PRODUCTION_BUILD || !allowed) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
