import type { Metadata } from 'next';
import RetirementTaxTool from '@/components/tools/retirement-tax/RetirementTaxTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '退職金手取り計算ツール | FREENOUGH 資産シミュレーター',
  description: '退職金の額と勤続年数から、退職所得控除・所得税・住民税を差し引いた手取り額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/retirement-tax`,
  },
};

const topics = TOOL_MAP['retirement-tax']?.topics ?? [];

export default function RetirementTaxPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <RetirementTaxTool relatedArticles={relatedArticles} />;
}
