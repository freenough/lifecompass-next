import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnalyticsScripts from '@/components/layout/AnalyticsScripts';
import { ORGANIZATION_SCHEMA, SITE_URL } from '@/lib/siteConfig';
import { ADSENSE_CLIENT_ID, IS_PRODUCTION_BUILD } from '@/lib/analytics';
import { UnsavedChangesProvider } from '@/lib/UnsavedChangesContext';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FIREシミュレーター | FREENOUGH 資産シミュレーター',
  description: '老後の資産推移・FIRE達成年齢・破綻リスクをシミュレーションします。',
  // 末尾スラッシュ必須: new URL()の相対パス解決はスラッシュなしだとbasePathの
  // 最後のセグメントを置き換えてしまい、basePathが消えたURLになる。
  metadataBase: new URL(`${SITE_URL}/`),
  // OGP画像はsrc/app/api/og/route.tsx（next/ogによる動的生成・軽量）。
  // opengraph-image.tsxのファイル規約を使わない理由はそのRoute Handlerのコメント参照
  // （basePath二重化・openGraph側だけ自動解決が優先される問題の回避）。
  openGraph: {
    images: [{ url: `${SITE_URL}/api/og`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [`${SITE_URL}/api/og`],
  },
};

const REVEAL_BOOT_SCRIPT =
  "(function(){var d=document.documentElement;d.classList.add('js-reveal');" +
  "setTimeout(function(){if(!window.__rvReady&&document.querySelector('.rv'))d.classList.remove('js-reveal');},4000);})();";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.className} suppressHydrationWarning>
      <body className="bg-white text-slate-800 antialiased min-h-screen flex flex-col">
        {/* スクロール表示演出（Reveal）用。HTML解析中に<html>へjs-revealを付け、初期表示のちらつきを
            防ぐ。4秒後に.rv要素があるのにRevealが動作開始していなければ（ハイドレーション失敗等）
            js-revealを外し、内容が非表示のまま残る事故を防ぐ（implementation_lp_scroll_reveal.md 3-4節）。
            .rvのないページでは外さない（後からLPへクライアント遷移したときに演出を効かせるため。
            implementation_lp_scroll_reveal_fallback_guard.md）。 */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
        />
        {/* GA4は本番ビルドかつ本番ドメインのときだけ（ホスト名はクライアント側で判定）。
            AdSenseは本番ビルドのときだけで、ホスト名では絞らない。読み込み方（strategy）は従来のまま
            （claude_instruction_ga4_production_only.md）。 */}
        <AnalyticsScripts />
        {IS_PRODUCTION_BUILD && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <UnsavedChangesProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
