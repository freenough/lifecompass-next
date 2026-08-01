import type { Metadata } from 'next';
import FireAgeTool from '@/components/tools/FireAgeTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';

export const metadata: Metadata = {
  title: '目標資産到達年齢シミュレーター | FREENOUGH 資産シミュレーター',
  description: '今の積立額を続けたら、目標資産に何歳で到達するかを計算する無料ツールです。FIREを目指す資産形成期間の目安としてもご活用いただけます。',
  alternates: {
    canonical: `${SITE_URL}/tools/fire-age`,
  },
};

// TOOLS配列（src/app/tools/page.tsx）のfire-ageエントリと同じtopicsを使う
// （TOOLS配列自体は一覧ページのUI専用のためimportせず、既存のtitle/description重複と同じ方針で値を複製）。
const TOPICS = ['fire_age'];

export default function FireAgePage() {
  const relatedArticles = getRelatedPostsForTopics(TOPICS).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <FireAgeTool relatedArticles={relatedArticles} />;
}
