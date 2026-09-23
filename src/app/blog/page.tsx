import { Suspense } from 'react';
import { getAllPosts } from '@/lib/blog';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { BLOG_DESCRIPTION } from '@/lib/siteCopy';
import { resolveFeaturedPosts } from '@/lib/featuredPosts';
import BlogListClient, { BlogListView } from '@/components/blog/BlogListClient';
import FeaturedPostsList from '@/components/blog/FeaturedPostsList';
import SimulatorCtaCard from '@/components/blog/SimulatorCtaCard';
import Container from '@/components/layout/Container';
import PageHeader from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: 'ブログ | FREENOUGH 資産シミュレーター',
  description: BLOG_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

// lg以上は「フィルター＋記事一覧」と「注目記事・導線カード」の2カラム（右列はsticky、top=ヘッダー59px＋24px）。
// lg未満は1カラムで、同じ右列の要素が記事一覧の後に並ぶ（DOMは複製しない）
// （claude_instruction_blog_list_implementation.md 1〜2節）。
export default function BlogPage() {
  const posts = getAllPosts();
  const featuredPosts = resolveFeaturedPosts(posts);

  return (
    <Container className="py-12">
      <PageHeader
        title="ブログ"
        description={BLOG_DESCRIPTION}
        breadcrumbs={[
          { name: '資産シミュレーター', href: '/' },
          { name: 'ブログ', href: '/blog' },
        ]}
      />

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 lg:items-start">
        <div>
          {posts.length === 0 ? (
            <p className="text-slate-400">記事はまだありません。</p>
          ) : (
            // useSearchParamsを使うBlogListClientはSuspense境界が必要。サーバー生成HTMLには
            // フォールバック（絞り込みなしの全記事）が入るため、全記事へのリンクがクロール可能なまま残る。
            <Suspense fallback={<BlogListView posts={posts} />}>
              <BlogListClient posts={posts} />
            </Suspense>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[83px]">
          <FeaturedPostsList posts={featuredPosts} />
          <SimulatorCtaCard />
        </aside>
      </div>
    </Container>
  );
}
