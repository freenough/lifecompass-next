import Link from 'next/link';
import type { Metadata } from 'next';
import { getHitoriHojinPostsBySeries } from '@/lib/hitoriHojinBlog';
import HitoriHojinGuideSection from '@/components/hitori-hojin/HitoriHojinGuideSection';
import HitoriHojinManageSection from '@/components/hitori-hojin/HitoriHojinManageSection';
import Container from '@/components/layout/Container';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';
import { SIMULATOR_CTA_LABEL } from '@/lib/ctaCopy';

const SERIES = 'hitori-hojin-intro';

export const metadata: Metadata = {
  title: '一人法人を、FIREの選択肢に。 | FREENOUGH',
  description:
    '税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。',
  openGraph: {
    title: '一人法人を、FIREの選択肢に。 | FREENOUGH',
    description:
      '税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。',
    url: HITORI_HOJIN_SITE_URL,
  },
  alternates: {
    canonical: HITORI_HOJIN_SITE_URL,
  },
};

export default function HitoriHojinLandingPage() {
  const posts = getHitoriHojinPostsBySeries(SERIES);
  const knowledgePosts = posts.filter((post) => post.category === 'knowledge');
  const considerPosts = posts.filter((post) => post.category === 'consider');

  // ルートレイアウト（src/app/layout.tsx）がすでに<main>で包んでいるため、ここは<div>にして入れ子を避ける
  // （impl_hitori_hojin_lp_ui.md 5-4節）。
  return (
    <div>
      {/* Hero */}
      <section className="py-16 bg-[#EFF6FF]">
        <div className="mx-auto max-w-5xl px-6 text-center">
          {/* 下の本文・セクション群(max-w-5xl)と同じ幅のコンテナに広げた上で、
              word-break: keep-all + wbrで「一人法人を、」/「FIREの選択肢に。」の
              意味の区切りでのみ改行させる(幅に余裕があれば1行に収まる)。 */}
          <h1 className="text-[clamp(2.25rem,8vw,3.75rem)] font-bold text-[#0F2A4A] leading-snug [word-break:keep-all]">
            一人法人を、<wbr />FIREの選択肢に。
          </h1>
          <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
            これから法人化を考える人にも、すでに一人法人を運営している人にも。
            税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。
          </p>
        </div>
      </section>

      {/* Intro。本文の幅はContainer（本体LPと同じ基準幅）に合わせ、段落はmax-w-2xl（1行およそ40字）に
          絞って左寄せにする。[line-break:strict]は和文の禁則処理（impl_hitori_hojin_lp_ui.md 3節）。 */}
      <section className="py-12">
        <Container>
          <div className="max-w-2xl text-sm md:text-base text-slate-700 leading-relaxed space-y-4 [line-break:strict]">
            <p>
              FIREというと、「完全に働くのをやめること」だけをイメージしがちです。でも、完全リタイアと会社員の間には、仕事を続けながら働き方や収入の持ち方を変え、資産形成を続けるという選択肢もあります。その選択肢の一つとして、一人法人があります。
            </p>
            <p>
              このシリーズでは、「法人化すれば得をする」という切り口ではなく、税金・社会保険・役員報酬・資産の置き場所といった一人法人特有の論点を、自分のFIRE計画の中でどう位置づけるかという視点で整理します。
            </p>
          </div>
        </Container>
      </section>

      {/* 「一人法人を知る」「一人法人を考える」の記事一覧（薄いグレー背景。資産シミュレーター側の
          白/グレー切り替え構成に合わせる）。 */}
      <HitoriHojinGuideSection knowledgePosts={knowledgePosts} considerPosts={considerPosts} />

      {/* 管理する（法人資産管理ツールPhase1への導線）。計算する（CompanyState実装待ち）は
          引き続き非表示のままにする。 */}
      <HitoriHojinManageSection />

      {/* FIRE資産シミュレーターへのCTA。資産シミュレーター側の最終CTAセクション（「まず、
          自分の数字を入れてみる。」）と同じく、角丸・枠線付きの箱ではなく画面幅いっぱいの
          背景帯にし、コンテンツのみ中央寄せ・幅を制限する。-mb-16はFooter.tsxのmt-16
          (margin-top: 4rem)を打ち消すための負のマージン（asset-simulator側page.tsxの
          CTAセクションと同じ理由。bodyがflex flex-colのためmain/footer間のmarginは
          相殺されず、Footerのmt-16がそのまま本セクション背景色の外側の白い隙間になる）。 */}
      <section className="bg-slate-50 py-16 -mb-16">
        {/* 説明文はmax-w-xlに絞り、[line-break:strict]で和文の禁則処理をかける（impl_hitori_hojin_lp_ui.md 5-3節）。
            ボタン文言はctaCopy.tsの定数（お悩みカード・SimulatorCtaCardと同じ「シミュレーターで試算」、
            SimulatorCtaCardに合わせて矢印なし）。行き先はLPトップではなくシミュレーター本体（/app）。 */}
        <div className="mx-auto max-w-xl px-6 text-center">
          <p className="text-sm text-slate-600 leading-relaxed mb-6 [line-break:strict]">
            一人法人を考える前に、まずは自分の必要資産額を確認してみてください。一人法人はFIREを実現するための選択肢の一つです。
          </p>
          <Link
            href="/app?utm_source=hojin_lp&utm_medium=referral&utm_campaign=hitori_hojin_lp"
            className="inline-block bg-[#0F2A4A] text-white font-bold px-8 py-3 rounded hover:opacity-90 transition-opacity"
          >
            {SIMULATOR_CTA_LABEL}
          </Link>
        </div>
      </section>
    </div>
  );
}
