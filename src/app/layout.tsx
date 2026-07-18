import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SITE_URL } from '@/lib/siteConfig';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LifeCompass — FIRE資産シミュレーター',
  description: '老後の資産推移・FIRE達成年齢・破綻リスクをシミュレーションします。',
  // 末尾スラッシュ必須: new URL()の相対パス解決はスラッシュなしだとbasePathの
  // 最後のセグメントを置き換えてしまい、basePathが消えたURLになる。
  metadataBase: new URL(`${SITE_URL}/`),
  openGraph: {
    images: [{ url: 'images/ogp.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['images/ogp.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJP.className}>
      <body className="bg-white text-slate-800 antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
