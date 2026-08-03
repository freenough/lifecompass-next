import type { Metadata } from 'next';
import CompoundInterestTool from '@/components/tools/CompoundInterestTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '積立(複利)計算機 | FREENOUGH 資産シミュレーター',
  description: '現在の資産・毎月の積立額・想定利回り・積立期間を入力すると、将来の資産額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/compound`,
  },
};

const topics = TOOL_MAP['compound']?.topics ?? [];

export default function CompoundInterestPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <CompoundInterestTool relatedArticles={relatedArticles} />;
}
