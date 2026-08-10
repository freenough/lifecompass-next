import type { Metadata } from 'next';
import RetirementIdecoTimingTool from '@/components/tools/retirement-ideco-timing/RetirementIdecoTimingTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '退職金×iDeCo 受給タイミング比較 | FREENOUGH 資産シミュレーター',
  description: '退職金とiDeCo一時金、受け取る年齢の組み合わせで手取り額がどう変わるかを、退職所得控除の重複排除ルール(19年・10年ルール)を踏まえて試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/retirement-ideco-timing`,
  },
};

const topics = TOOL_MAP['retirement-ideco-timing']?.topics ?? [];

export default function RetirementIdecoTimingPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <RetirementIdecoTimingTool relatedArticles={relatedArticles} />;
}
