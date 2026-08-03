import type { Metadata } from 'next';
import EducationCostTool from '@/components/tools/education-cost/EducationCostTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: '教育費シミュレーター | FREENOUGH 資産シミュレーター',
  description: '子供の現在の学年と進学プラン(公立/私立)から、教育費の総額と負担がピークになる時期を無料で試算できます。',
  alternates: {
    canonical: `${SITE_URL}/tools/education-cost`,
  },
};

const topics = TOOL_MAP['education-cost']?.topics ?? [];

export default function EducationCostPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <EducationCostTool relatedArticles={relatedArticles} />;
}
