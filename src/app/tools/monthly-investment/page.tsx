import type { Metadata } from 'next';
import MonthlyInvestmentTool from '@/components/tools/MonthlyInvestmentTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '積立額シミュレーター|新NISAは毎月いくら積み立てればいい? | FREENOUGH 資産シミュレーター',
  description: '目標資産・現在の資産・想定利回りを入力するだけで、目標達成に必要な毎月の積立額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/monthly-investment`,
  },
};

const topics = TOOL_MAP['monthly-investment']?.topics ?? [];

export default function MonthlyInvestmentPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <MonthlyInvestmentTool relatedArticles={relatedArticles} />;
}
