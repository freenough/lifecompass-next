import type { Metadata } from 'next';
import FireAgeTool from '@/components/tools/FireAgeTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '目標資産到達年齢シミュレーター | FREENOUGH 資産シミュレーター',
  description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算する無料ツールです。FIREを目指す資産形成期間の目安としてもご活用いただけます。',
  alternates: {
    canonical: `${SITE_URL}/tools/fire-age`,
  },
};

const topics = TOOL_MAP['fire-age']?.topics ?? [];

export default function FireAgePage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <FireAgeTool relatedArticles={relatedArticles} />;
}
