import type { Metadata } from 'next';
import RetirementTaxTool from '@/components/tools/retirement-tax/RetirementTaxTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';

export const metadata: Metadata = {
  title: '退職金手取り計算ツール | FREENOUGH 資産シミュレーター',
  description: '退職金の額と勤続年数から、退職所得控除・所得税・住民税を差し引いた手取り額を試算できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/retirement-tax`,
  },
};

// TOOLS配列（src/app/tools/page.tsx）のretirement-taxエントリと同じtopicsを使う
// （TOOLS配列自体は一覧ページのUI専用のためimportせず、既存のtitle/description重複と同じ方針で値を複製）。
const TOPICS = ['retirement_tax'];

export default function RetirementTaxPage() {
  const relatedArticles = getRelatedPostsForTopics(TOPICS).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <RetirementTaxTool relatedArticles={relatedArticles} />;
}
