import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import {
  IconChartBar,
  IconBuildingBank,
  IconLock,
  IconPencil,
  IconPlayerPlay,
  IconChartLine,
  IconTrendingUp,
  IconCalculator,
  IconHourglass,
  IconClockDollar,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { BustPoseType, HairType, FaceType, AccessoryType } from 'react-peeps';
import { getFeaturedPosts, getAllPosts } from '@/lib/blog';
import ConcernBlockLP from '@/components/concerns/ConcernBlockLP';
import AssetManagementPromoSection from '@/components/lp/AssetManagementPromoSection';
import FireGuideCarousel from '@/components/lp/FireGuideCarousel';
import PersonaAvatar from '@/components/lp/PersonaAvatar';
import SectionHeading from '@/components/layout/SectionHeading';
import { ASSET_MANAGEMENT_PATH } from '@/lib/assetManagement/routes';

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

interface PersonaParts {
  body: BustPoseType;
  hair: HairType;
  face: FaceType;
  accessory: AccessoryType;
  backgroundColor: string;
  strokeColor: string;
}

const characters: {
  name: string;
  sub: string;
  worry: string;
  label: string;
  persona: PersonaParts;
  /** 中村夫婦のみ、配偶者分のパーツを重ねて表示する */
  personaSpouse?: PersonaParts;
  href?: string;
}[] = [
  {
    name: '田中さん',
    sub: '42歳・既婚（サラリーマン）',
    worry: 'NISAもiDeCoも続けてきた。でもゴールが見えない',
    label: '貯めてきた。でも、いつ辞められる？',
    persona: {
      body: 'BlazerBlackTee',
      hair: 'Short',
      face: 'Calm',
      accessory: 'GlassRound',
      backgroundColor: '#DCEEF5',
      strokeColor: '#0F2A4A',
    },
    href: 'https://note.com/freenough/m/m2d3fea55a06e',
  },
  {
    name: '山本さん',
    sub: '34歳・独身エンジニア',
    worry: '積立額を増やしても、開始年齢が本当のボトルネックだった',
    label: 'FIRE達成は、いつ始めるかで決まる。',
    persona: {
      body: 'Device',
      hair: 'ShortMessy',
      face: 'Driven',
      accessory: 'GlassRoundThick',
      backgroundColor: '#DCEEF5',
      strokeColor: '#0F2A4A',
    },
    href: 'https://note.com/freenough/m/m426fdd7bec8c',
  },
  {
    name: '中村夫婦',
    sub: '共働き',
    worry: '収入は高いのに、いつ辞められるか見えない',
    label: '教育費とFIREを両立したい。',
    persona: {
      body: 'ButtonShirt',
      hair: 'Short',
      face: 'Smile',
      accessory: 'None',
      backgroundColor: '#DCEEF5',
      strokeColor: '#0F2A4A',
    },
    personaSpouse: {
      body: 'PoloSweater',
      hair: 'MediumLong',
      face: 'Smile',
      accessory: 'None',
      backgroundColor: '#DCEEF5',
      strokeColor: '#0F2A4A',
    },
    href: 'https://note.com/freenough/m/m9e4bd2e0a99b',
  },
  {
    name: '佐々木さん',
    sub: '53歳',
    worry: '退職金・年金・NISAをまとめて計算したい',
    label: '早期退職しても大丈夫？',
    persona: {
      body: 'ShirtCoat',
      hair: 'GrayShort',
      // 「Serious」は72px表示だと眉・目・口のパーツが淡く表情が視認しづらいため、
      // 実機確認の結果「Calm」に変更（doc記載の判断委任事項）
      face: 'Calm',
      accessory: 'None',
      backgroundColor: '#e2e8f0',
      strokeColor: '#94a3b8',
    },
  },
];

const steps: { step: string; label: string; Icon: Icon }[] = [
  { step: 'Step 1', label: '資産・収入を入力', Icon: IconPencil },
  { step: 'Step 2', label: 'シミュレーション実行', Icon: IconPlayerPlay },
  { step: 'Step 3', label: 'FIRE年齢・資産寿命を確認', Icon: IconChartLine },
];

export default function HomePage() {
  // FIREガイドセクション表示記事：既存4件（featured: true・priority順、blog.ts改修なし）
  // ＋ それ以外の記事からdate降順で2件を追加し、計6件をカルーセルに渡す。
  const featuredPosts = getFeaturedPosts().slice(0, 4);
  const featuredSlugs = new Set(featuredPosts.map((p) => p.slug));
  const latestNonFeaturedPosts = getAllPosts()
    .filter((post) => !featuredSlugs.has(post.slug))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 2);
  const guidePosts = [...featuredPosts, ...latestNonFeaturedPosts];

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
            <p className="mt-2 text-sm text-slate-500 leading-relaxed text-balance sm:text-base">
              1,000通りの市場変動で、破綻確率まで計算します。
            </p>
            <Link
              href="/app"
              className="mt-12 inline-block rounded px-8 py-4 text-base font-semibold text-white shadow transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg"
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
            <div key={f.title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex aspect-square h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-slate-600">
                <f.Icon size={26} className="text-slate-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AD_SLOT_A: 差別化〜キャラクター間 */}
      {/* <AdSlot slotId="slot-a" className="mx-auto max-w-5xl px-6" /> */}

      {/* ③.7 悩み×解決 */}
      <ConcernBlockLP />

      {/* ③.5 FIREガイド */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            label="FIREガイド"
            heading="FIREガイド"
            body="シミュレーターをより活用するための解説記事を公開しています"
            linkHref="/blog"
            linkLabel="記事一覧を見る→"
          />

          {/* 横スクロールカルーセル（CSS Scroll Snapのみ、ライブラリ不使用）。
              矢印ボタン＋クリック&ドラッグスクロールはFireGuideCarousel（Client Component）側で
              実装する。「◯分で読む→」は表示しない（noteのタイプ診断カードとの統一感を優先。
              readingTimeフィールド自体は将来の用途のため残す） */}
          <FireGuideCarousel posts={guidePosts} />

        </div>
      </section>

      {/* ③.6 かんたん計算ツール */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            label="ツール"
            heading="かんたん計算ツール"
            body="シミュレーターの前に、気になる数字だけサクッと試せます"
            linkHref="/tools"
            linkLabel="ツール一覧を見る→"
          />

          <div className="grid grid-cols-2 gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {lpTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="border-y border-slate-200 rounded-none p-6 hover:bg-white transition-colors"
              >
                <tool.Icon size={32} className="text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-900">{tool.title}</h3>
                <p className="mt-2 text-xs lg:text-sm text-slate-500 leading-relaxed">{tool.body}</p>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* ③.8 資産管理ツール導線 */}
      <AssetManagementPromoSection />

      {/* ④ あなたはどのタイプ？ */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            label="ケーススタディ"
            heading="あなたはどのタイプ？"
            body="年齢や家族構成が近いケースのシミュレーション結果を、参考として確認できます"
            linkHref="https://note.com/freenough"
            linkLabel="NOTEを見る→"
            linkExternal
          />
          <div className="flex flex-col divide-y divide-slate-200">
            {characters.map((c) => {
              /* モバイル（640px未満）ではアバター＋名前・属性を横並びのヘッダー行にまとめる
                 （デスクトップではavatarのみ・名前属性はtextBlock側に表示、sm:hiddenで出し分け）。
                 モバイル対応前に発生していた崩れ（本文列がshrink-0要素に押し潰され引用文が
                 7行折り返し→items-centerで行の縦中央に再配置されたアバター/バッジが本文と重なる）
                 の対策として、モバイルはflex-col + items-start、デスクトップはflex-row(-reverse) +
                 items-centerの既存挙動を維持する。 */
              const avatarHeader = (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center shrink-0">
                    <PersonaAvatar {...c.persona} dashed={!c.href} />
                    {c.personaSpouse && (
                      <PersonaAvatar
                        {...c.personaSpouse}
                        className="-ml-5 z-10 ring-2 ring-white"
                      />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 sm:hidden">
                    <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.sub}</span>
                  </div>
                </div>
              );

              const textBlock = (
                <div className="w-full sm:w-auto flex-1 min-w-0 flex flex-col gap-1">
                  <p className="text-lg sm:text-xl font-bold text-slate-900 leading-snug before:content-['「'] after:content-['」']">
                    {c.worry}
                  </p>
                  <div className="hidden sm:flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-700">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.sub}</span>
                  </div>
                  <p className="text-xs text-slate-500">{c.label}</p>
                </div>
              );

              const badgeAndLink = (
                <div className="flex w-full sm:w-auto sm:flex-col items-center sm:items-end justify-end sm:justify-center gap-2 shrink-0">
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
                  {c.href && (
                    <span className="text-xs font-semibold text-accent whitespace-nowrap">noteで読む→</span>
                  )}
                </div>
              );

              // claude_instruction_lp_polish_round2.md 4節: テキストは常に左詰めのままなのに
              // アバターだけi%2で左右交互反転していると"完全な鏡写し"にならず揃っていない
              // 印象になるため、アバター・バッジとも全カード左固定（sm:flex-row固定）に統一する。
              const rowContent = (
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 py-6"
                >
                  {avatarHeader}
                  {textBlock}
                  {badgeAndLink}
                </div>
              );

              return c.href ? (
                <a
                  key={c.name}
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-white/60 transition-colors"
                >
                  {rowContent}
                </a>
              ) : (
                <div key={c.name} className="cursor-default">
                  {rowContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ⑤ 使い方（3ステップ） */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 w-full">
          <h2 className="text-[1.75rem] sm:text-4xl font-bold text-slate-900 text-center mb-12">使い方</h2>
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
          {/* instruction_asset_simulator_lp_polish_addendum4.md 修正1: 自動折り返しに任せず、
              幅に関わらず常に2行(「まず、自分の数字を」/「入れてみる。」)で表示する */}
          <h2 className="text-[1.75rem] sm:text-4xl font-bold text-slate-900">
            まず、自分の数字を<br />入れてみる。
          </h2>
          <p className="mt-3 text-slate-500">それだけでFIREが見えてくる。</p>
          <Link
            href="/app"
            className="mt-8 inline-block rounded px-8 py-4 text-base font-semibold text-white shadow transition-all duration-150 ease-out whitespace-nowrap hover:-translate-y-0.5 hover:shadow-lg"
            style={{ backgroundColor: '#334155' }}
          >
            シミュレーターを開く →
          </Link>
          <p className="mt-4 text-sm text-slate-400">無料・登録不要</p>

          {/* 資産管理ツールへの従属導線（3章）。主CTAより視覚的優先度を下げるため、
              ボタンではなく通常のテキストリンクとして実装する。 */}
          <div className="mt-10 flex items-center gap-4 max-w-xs mx-auto">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-xs text-slate-400 whitespace-nowrap">すでに試算した方は</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>
          <p className="mt-3">
            <Link
              href={ASSET_MANAGEMENT_PATH}
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              資産を記録して、進捗を確認する →
            </Link>
          </p>
        </div>
      </section>

      {/* AD_SLOT_B: CTA下 */}
      {/* <AdSlot slotId="slot-b" className="mx-auto max-w-5xl px-6 py-4" /> */}

    </div>
  );
}
