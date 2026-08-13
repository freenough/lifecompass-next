import type { Metadata } from 'next';
import ResidentTaxTimingTool from '@/components/tools/resident-tax-timing/ResidentTaxTimingTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '退職後の住民税キャッシュフロー試算 | FREENOUGH 資産シミュレーター',
  description: '退職月・退職前年の年収から、住民税がいつ・いくら発生するかを試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/resident-tax-timing`,
  },
};

const topics = TOOL_MAP['resident-tax-timing']?.topics ?? [];

export default function ResidentTaxTimingPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <ResidentTaxTimingTool relatedArticles={relatedArticles} />;
}
