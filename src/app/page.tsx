import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import {
  IconChartBar,
  IconBuildingBank,
  IconLock,
  IconUser,
  IconUsers,
  IconBriefcase,
  IconCode,
  IconPencil,
  IconPlayerPlay,
  IconChartLine,
  IconTrendingUp,
  IconCalculator,
  IconHourglass,
  IconClockDollar,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { getFeaturedPosts } from '@/lib/blog';

const HeroDemo = dynamic(() => import('@/components/lp/HeroDemo'), { ssr: false });

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

const features: { title: string; body: string; Icon: Icon }[] = [
  {
    title: 'モンテカルロ対応',
    body: '平均値ではなく「1,000通りの市場変動」で破綻確率を計算',
    Icon: IconChartBar,
  },
  {
    title: '日本制度に完全対応',
    body: 'NISA・iDeCo・退職金・年金を一体で計算',
    Icon: IconBuildingBank,
  },
  {
    title: 'データは端末の外に出ない',
    body: '入力した資産情報はサーバーに送信されません',
    Icon: IconLock,
  },
];

const lpTools: { title: string; body: string; href: string; Icon: Icon }[] = [
  {
    title: '積立(複利)計算機',
    body: '毎月の積立額と利回りから、将来の資産額を試算します',
    href: '/tools/compound',
    Icon: IconTrendingUp,
  },
  {
    title: '積立額逆算ツール',
    body: '目標資産額から、毎月の積立額を逆算します',
    href: '/tools/monthly-investment',
    Icon: IconCalculator,
  },
  {
    title: '目標資産到達年齢シミュレーター',
    body: '今の積立を続けたら、何歳で目標資産に届くかがわかります',
    href: '/tools/fire-age',
    Icon: IconHourglass,
  },
  {
    title: '年金繰上げ・繰下げ比較シミュレーター',
    body: '年金を何歳から受け取るとお得か、損益分岐年齢で比較します',
    href: '/tools/pension-timing',
    Icon: IconClockDollar,
  },
];

const characters: { name: string; sub: string; worry: string; label: string; Icon: Icon; href?: string }[] = [
  {
    name: '田中さん',
    sub: '42歳・既婚（サラリーマン）',
    worry: 'NISAもiDeCoも続けてきた。でもゴールが見えない',
    label: '貯めてきた。でも、いつ辞められる？',
    Icon: IconUser,
    href: 'https://note.com/freenough/m/m2d3fea55a06e',
  },
  {
    name: '山本さん',
    sub: '34歳・独身エンジニア',
    worry: '積立額を増やしても、開始年齢が本当のボトルネックだった',
    label: 'FIRE達成は、いつ始めるかで決まる。',
    Icon: IconCode,
    href: 'https://note.com/freenough/m/m426fdd7bec8c',
  },
  {
    name: '中村夫婦',
    sub: '共働き',
    worry: '収入は高いのに、いつ辞められるか見えない',
    label: '教育費とFIREを両立したい。',
    Icon: IconUsers,
  },
  {
    name: '佐々木さん',
    sub: '53歳',
    worry: '退職金・年金・NISAをまとめて計算したい',
    label: '早期退職しても大丈夫？',
    Icon: IconBriefcase,
  },
];

const steps: { step: string; label: string; Icon: Icon }[] = [
  { step: 'Step 1', label: '資産・収入を入力', Icon: IconPencil },
  { step: 'Step 2', label: 'シミュレーション実行', Icon: IconPlayerPlay },
  { step: 'Step 3', label: 'FIRE年齢・資産寿命を確認', Icon: IconChartLine },
];

export default function HomePage() {
  const featuredPosts = getFeaturedPosts().slice(0, 4);

  return (
    <div className="flex flex-col">

      {/* ① Hero — 2カラム。
          左右並びに切り替わるbreakpointを sm:(640px) から lg:(1024px) に変更した。
          640〜1023pxでは、右カラムのライブデモが固定460px+shrink-0のため、テキスト列の
          最小幅と足し合わせるとページ全体が横に827px分はみ出し、グラフが右で見切れる問題
          （実測: scrollWidth=807px固定 vs viewport 640〜806pxで確認）があった。この幅では
          モバイル同様の縦積み・w-full表示にすることで解消する。1024px以上は十分な横幅が
          あるため従来通り固定460pxの2カラム表示のまま。 */}
      <section className="mx-auto max-w-5xl w-full px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8">

          {/* 左カラム：テキスト */}
          <div className="flex-1 flex flex-col items-center text-center sm:items-start sm:text-left">
            <h1 className="text-[clamp(2.25rem,8vw,3.75rem)] font-bold tracking-tight text-slate-900 text-balance">
              あなたのFIREは、<br />
              何歳？
            </h1>
            {/* ライブデモ（1024px未満・見出しの直下） */}
            <div className="lg:hidden mt-6 w-full">
              <HeroDemo />
            </div>
            <p className="mt-10 text-base text-slate-500 leading-relaxed text-balance sm:text-lg">
              未来の選択肢を、自分の数字で描く。
            </p>
            <p className="mt-2 text-left text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
              1,000通りの市場変動で、破綻確率まで計算します。
            </p>
            <Link
              href="/app"
              className="mt-12 inline-block rounded-lg px-8 py-4 text-base font-semibold text-white shadow transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#334155' }}
            >
              今すぐシミュレーションする →
            </Link>
            <p className="mt-4 text-sm text-slate-400">無料・登録不要・データは端末内に保存</p>
          </div>

          {/* 右カラム：ライブデモ（1024px以上のみ）。
              self-stretchを外したことで、親の`lg:items-start`によりカードは自身のコンテンツに
              応じた高さ（可変・auto）になる。以前はself-stretchでテキスト列と同じ高さまで
              引き伸ばされ、カード内部に余分な空白ができていた（実測: 900px幅でカード下部に
              88px分の空白を確認）。 */}
          <div className="hidden lg:flex lg:w-[460px] lg:shrink-0">
            <HeroDemo />
          </div>

        </div>
      </section>

      {/* ③ 差別化（3カラム） */}
      <section className="mx-auto max-w-5xl px-6 py-12 w-full">
        <div className="grid gap-8 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <f.Icon size={32} className="text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AD_SLOT_A: 差別化〜キャラクター間 */}
      {/* <AdSlot slotId="slot-a" className="mx-auto max-w-5xl px-6" /> */}

      {/* ③.5 FIREガイド */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">FIREガイド</h2>
            <p className="mt-2 text-sm text-slate-500">
              シミュレーターをより活用するための解説記事を公開しています
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="rounded-xl border border-slate-200 bg-white shadow-sm flex overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
              >
                {/* サムネイル: 固定幅190px・3:2比率固定（高さに追従させない）。
                    stretchにするとタイトルが増えた分だけサムネ幅も伸びてテキストエリアを
                    圧迫し、さらに折り返しが増えて高さが伸びる…という悪循環が起きるため、
                    意図的に固定サイズ+self-centerにしている。 */}
                <div className="relative w-[190px] aspect-[3/2] shrink-0 self-center overflow-hidden bg-slate-100">
                  {post.eyecatch && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.eyecatch}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 p-[14px] flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-3">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500">{post.excerpt}</p>
                  {/* 「◯分で読む→」は表示しない（noteのタイプ診断カードとの統一感を優先。
                      readingTimeフィールド自体は将来の用途のため残す） */}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/blog" className="text-sm font-semibold hover:underline" style={{ color: '#334155' }}>
              記事一覧を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ③.6 かんたん計算ツール */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">かんたん計算ツール</h2>
            <p className="mt-2 text-sm text-slate-500">
              シミュレーターの前に、気になる数字だけサクッと試せます
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {lpTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <tool.Icon size={32} className="text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{tool.body}</p>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/tools" className="text-sm font-semibold hover:underline" style={{ color: '#334155' }}>
              ツール一覧を見る →
            </Link>
          </div>
        </div>
      </section>

      {/* ④ あなたはどのタイプ？ */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
            あなたはどのタイプ？
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {characters.map((c) => {
              const cardInner = (
                <>
                  <div className="flex items-start justify-between">
                    <c.Icon size={32} className="text-slate-600" />
                    {c.href ? (
                      <span
                        className="text-[10px] font-semibold text-white rounded-full px-2 py-0.5 shrink-0"
                        style={{ backgroundColor: '#334155' }}
                      >
                        公開中
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 shrink-0">
                        近日公開
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-base font-semibold text-slate-900">{c.name}</span>
                    <span className="text-sm text-slate-400">{c.sub}</span>
                  </div>
                  <p className="text-sm text-slate-600">{c.label}</p>
                  <p className="text-sm text-slate-400 before:content-['「'] after:content-['」']">
                    {c.worry}
                  </p>
                </>
              );

              return c.href ? (
                <a
                  key={c.name}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-2 hover:shadow-md hover:border-slate-300 transition-all"
                >
                  {cardInner}
                </a>
              ) : (
                <div
                  key={c.name}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-2 cursor-default"
                >
                  {cardInner}
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <a
              href="https://note.com/freenough"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold hover:underline"
              style={{ color: '#334155' }}
            >
              それぞれのシミュレーション結果をnoteで読む →
            </a>
          </div>
        </div>
      </section>

      {/* ⑤ 使い方（3ステップ） */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 w-full">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">使い方</h2>
          <ol className="flex flex-col sm:flex-row gap-6 sm:gap-0 sm:divide-x sm:divide-slate-200">
            {steps.map((s) => (
              <li key={s.step} className="flex-1 flex flex-col items-center text-center px-6">
                <s.Icon size={32} className="text-slate-600 mb-2" />
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
                  {s.step}
                </span>
                <span className="mt-1 text-base font-semibold text-slate-900">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ⑥ CTA */}
      {/* -mb-16はFooter.tsxのmt-16(margin-top: 4rem)を打ち消すための負のマージン。
          bodyがflex flex-colのため、main/footer間のmarginは通常のブロック要素と違い
          相殺されず、Footerのmt-16がそのまま本セクション背景色の外側の白い隙間になっていた。
          Footer.tsx側は変更対象外のため、直前要素のマージンで打ち消す形で対応している。 */}
      <section className="bg-slate-50 py-20 -mb-16">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 text-balance sm:text-2xl">
            まず、自分の数字を入れてみる。
          </h2>
          <p className="mt-3 text-slate-500">それだけでFIREが見えてくる。</p>
          <Link
            href="/app"
            className="mt-8 inline-block rounded-lg px-8 py-4 text-base font-semibold text-white shadow transition-colors whitespace-nowrap"
            style={{ backgroundColor: '#334155' }}
          >
            シミュレーターを開く →
          </Link>
          <p className="mt-4 text-sm text-slate-400">無料・登録不要</p>
        </div>
      </section>

      {/* AD_SLOT_B: CTA下 */}
      {/* <AdSlot slotId="slot-b" className="mx-auto max-w-5xl px-6 py-4" /> */}

    </div>
  );
}
