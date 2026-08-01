import type { Metadata } from 'next';
import EducationCostTool from '@/components/tools/education-cost/EducationCostTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';

export const metadata: Metadata = {
  title: '教育費シミュレーター | FREENOUGH 資産シミュレーター',
  description: '子供の現在の学年と進学プラン(公立/私立)から、教育費の総額と負担がピークになる時期を無料で試算できます。',
  alternates: {
    canonical: `${SITE_URL}/tools/education-cost`,
  },
};

// TOOLS配列（src/app/tools/page.tsx）のeducation-costエントリと同じtopicsを使う
// （TOOLS配列自体は一覧ページのUI専用のためimportせず、既存のtitle/description重複と同じ方針で値を複製）。
const TOPICS = ['education_cost'];

export default function EducationCostPage() {
  const relatedArticles = getRelatedPostsForTopics(TOPICS).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <EducationCostTool relatedArticles={relatedArticles} />;
}
