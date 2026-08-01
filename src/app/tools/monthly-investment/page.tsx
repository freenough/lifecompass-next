import type { Metadata } from 'next';
import MonthlyInvestmentTool from '@/components/tools/MonthlyInvestmentTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';

export const metadata: Metadata = {
  title: '積立額シミュレーター|新NISAは毎月いくら積み立てればいい? | FREENOUGH 資産シミュレーター',
  description: '目標資産・現在の資産・想定利回りを入力するだけで、目標達成に必要な毎月の積立額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/monthly-investment`,
  },
};

// TOOLS配列（src/app/tools/page.tsx）のmonthly-investmentエントリと同じtopicsを使う
// （TOOLS配列自体は一覧ページのUI専用のためimportせず、既存のtitle/description重複と同じ方針で値を複製）。
const TOPICS = ['nisa', 'compound_interest'];

export default function MonthlyInvestmentPage() {
  const relatedArticles = getRelatedPostsForTopics(TOPICS).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <MonthlyInvestmentTool relatedArticles={relatedArticles} />;
}
