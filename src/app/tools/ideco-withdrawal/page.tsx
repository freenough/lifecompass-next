import type { Metadata } from 'next';
import IdecoWithdrawalTool from '@/components/tools/ideco-withdrawal/IdecoWithdrawalTool';
import { SITE_URL } from '@/lib/siteConfig';
import { getRelatedPostsForTopics } from '@/lib/blog';
import { TOOL_MAP } from '@/lib/toolMetadata';

export const metadata: Metadata = {
  title: 'iDeCo/DC出口戦略シミュレーター | FREENOUGH 資産シミュレーター',
  description: 'iDeCo/DC残高を一時金・年金・併用のどの方法で受け取るかで、手取り総額がどう変わるかを比較できる無料ツールです。',
  alternates: {
    canonical: `${SITE_URL}/tools/ideco-withdrawal`,
  },
};

const topics = TOOL_MAP['ideco-withdrawal']?.topics ?? [];

export default function IdecoWithdrawalPage() {
  const relatedArticles = getRelatedPostsForTopics(topics).map((p) => ({ title: p.title, href: `/blog/${p.slug}` }));
  return <IdecoWithdrawalTool relatedArticles={relatedArticles} />;
}
