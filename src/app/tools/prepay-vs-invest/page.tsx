import type { Metadata } from 'next';
import PrepayVsInvestTool from '@/components/tools/prepay-vs-invest/PrepayVsInvestTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '繰上返済 vs 投資 比較シミュレーター | FREENOUGH 資産シミュレーター',
  description: '住宅ローンの繰上返済と投資、どちらが適しているかの判断材料を比較できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/prepay-vs-invest`,
  },
};

const topics = TOOL_MAP['prepay-vs-invest']?.topics ?? [];

export default function PrepayVsInvestPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <PrepayVsInvestTool relatedArticles={relatedArticles} />;
}
