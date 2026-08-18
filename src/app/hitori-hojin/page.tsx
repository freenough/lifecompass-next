import Link from 'next/link';
import type { Metadata } from 'next';
import { getHitoriHojinPostsBySeries } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_CATEGORIES } from '@/lib/hitoriHojinCategories';
import HitoriHojinContentSection from '@/components/hitori-hojin/HitoriHojinContentSection';
import { SITE_URL } from '@/lib/siteConfig';

const SERIES = 'hitori-hojin-intro';

export const metadata: Metadata = {
  title: '一人法人を、FIREの選択肢に。 | FREENOUGH',
  description:
    '税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。',
  alternates: {
    canonical: `${SITE_URL}/hitori-hojin`,
  },
};

export default function HitoriHojinLandingPage() {
  const posts = getHitoriHojinPostsBySeries(SERIES);
  const knowledgePosts = posts.filter((post) => post.category === 'knowledge');
  const considerPosts = posts.filter((post) => post.category === 'consider');

  return (
    <main>
      {/* Hero */}
      <section className="py-16 bg-[#EFF6FF]">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F2A4A] leading-snug">
            一人法人を、FIREの選択肢に。
          </h1>
          <p className="mt-4 text-sm md:text-base text-slate-600 leading-relaxed">
            これから法人化を考える人にも、すでに一人法人を運営している人にも。
            税金や社会保険だけでなく、法人と個人のお金をどう考えるかを、FIREの視点から整理します。
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6 text-sm md:text-base text-slate-700 leading-relaxed space-y-4">
          <p>
            FIREというと、「完全に働くのをやめること」だけをイメージしがちです。でも、完全リタイアと会社員の間には、仕事を続けながら働き方や収入の持ち方を変え、資産形成を続けるという選択肢もあります。その選択肢の一つとして、一人法人があります。
          </p>
          <p>
            このシリーズでは、「法人化すれば得をする」という切り口ではなく、税金・社会保険・役員報酬・資産の置き場所といった一人法人特有の論点を、自分のFIRE計画の中でどう位置づけるかという視点で整理します。
          </p>
        </div>
      </section>

      {/* 一人法人を知る */}
      <HitoriHojinContentSection
        title={HITORI_HOJIN_CATEGORIES.knowledge.label}
        subtitle={HITORI_HOJIN_CATEGORIES.knowledge.subtitle}
        items={knowledgePosts}
      />

      {/* 一人法人を考える */}
      <HitoriHojinContentSection
        title={HITORI_HOJIN_CATEGORIES.consider.label}
        subtitle={HITORI_HOJIN_CATEGORIES.consider.subtitle}
        items={considerPosts}
        footerLink={{ label: '①から順番に読みたい方はこちら', href: `/hitori-hojin/blog?series=${SERIES}` }}
      />

      {/* ブログ一覧への導線 */}
      <section className="py-12 text-center">
        <Link href="/hitori-hojin/blog" className="text-sm font-semibold hover:underline" style={{ color: '#334155' }}>
          すべての記事を見る →
        </Link>
      </section>

      {/* FIRE資産シミュレーターへのCTA */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-6">
          <div className="bg-[#EFF6FF] border border-blue-100 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              一人法人を考える前に、まずは自分の必要資産額を確認してみてください。一人法人はFIREを実現するための選択肢の一つです。
            </p>
            <Link
              href="/?utm_source=hojin_lp&utm_medium=referral&utm_campaign=hitori_hojin_lp"
              className="inline-block bg-[#0F2A4A] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              資産シミュレーターで試算する →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
