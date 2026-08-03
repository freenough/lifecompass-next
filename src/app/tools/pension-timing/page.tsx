import type { Metadata } from 'next';
import PensionTimingTool from '@/components/tools/pension-timing/PensionTimingTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '年金 繰上げ・繰下げ 比較シミュレーター | FREENOUGH 資産シミュレーター',
  description: '65歳時点の年金見込額から、受給開始年齢を早める・遅らせる場合の年額・損益分岐年齢を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/pension-timing`,
  },
};

const topics = TOOL_MAP['pension-timing']?.topics ?? [];

export default function PensionTimingPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <PensionTimingTool relatedArticles={relatedArticles} />;
}
