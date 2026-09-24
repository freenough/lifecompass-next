import { IconFileText } from '@tabler/icons-react';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_CATEGORIES } from '@/lib/hitoriHojinCategories';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';
import Container from '@/components/layout/Container';
import SectionHeading from '@/components/layout/SectionHeading';
import HitoriHojinArticleList from './HitoriHojinArticleList';

interface HitoriHojinGuideSectionProps {
  knowledgePosts: HitoriHojinBlogPostMeta[];
  considerPosts: HitoriHojinBlogPostMeta[];
}

// 一人法人LPの記事一覧セクション（impl_hitori_hojin_lp_ui.md 4節）。
// 見出しは本体LPと同じSectionHeadingで1つにまとめ、「知る」「考える」はその下の2グループ（h3）にする。
// lg以上は左右2列（items-startで件数の少ない側を引き伸ばさない）、lg未満は「知る」を上にして縦に積む。
// 見出し・補足文の文言は仮（PreviewでKENZOが確認）。
export default function HitoriHojinGuideSection({ knowledgePosts, considerPosts }: HitoriHojinGuideSectionProps) {
  const groups = [
    { key: 'knowledge', posts: knowledgePosts },
    { key: 'consider', posts: considerPosts },
  ] as const;

  return (
    <section className="bg-slate-50 py-12">
      <Container>
        <SectionHeading
          label="一人法人ガイド"
          heading="一人法人を知る・考える"
          body="法人化の基本から、自分に合うかどうかの判断まで、FIREの視点で整理しています"
          linkHref={`${HITORI_HOJIN_SITE_URL}/blog`}
          linkLabel="記事一覧を見る→"
          linkAbsolute
        />

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-8">
          {groups.map(({ key, posts }) => (
            <div key={key}>
              <h3 className="text-lg font-semibold text-slate-900">{HITORI_HOJIN_CATEGORIES[key].label}</h3>
              <p className="mt-1 mb-4 text-sm text-slate-500">{HITORI_HOJIN_CATEGORIES[key].subtitle}</p>
              <HitoriHojinArticleList posts={posts} icon={IconFileText} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
