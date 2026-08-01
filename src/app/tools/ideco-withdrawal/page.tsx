import type { Metadata } from 'next';
import IdecoWithdrawalTool from '@/components/tools/ideco-withdrawal/IdecoWithdrawalTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'iDeCo/DC出口戦略シミュレーター | FREENOUGH 資産シミュレーター',
  description: 'iDeCo/DC残高を一時金・年金・併用のどの方法で受け取るかで、手取り総額がどう変わるかを比較できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/ideco-withdrawal`,
  },
};

// TOOLS配列（src/app/tools/page.tsx）のideco-withdrawalエントリと同じtopicsを使う
// （TOOLS配列自体は一覧ページのUI専用のためimportせず、既存のtitle/description重複と同じ方針で値を複製）。
const TOPICS = ['ideco', 'withdrawal'];

export default function IdecoWithdrawalPage() {
  const relatedArticles = getRelatedPostsForTopics(TOPICS).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <IdecoWithdrawalTool relatedArticles={relatedArticles} />;
}
