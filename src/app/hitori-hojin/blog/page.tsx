import type { Metadata } from 'next';
import { getAllHitoriHojinPosts } from '@/lib/hitoriHojinBlog';
import { SITE_URL } from '@/lib/siteConfig';
import HitoriHojinBlogListClient from '@/components/hitori-hojin/HitoriHojinBlogListClient';

export const metadata: Metadata = {
  title: '一人法人ブログ | FREENOUGH',
  description: '税金・社会保険・役員報酬・資産の置き場所など、一人法人特有の論点をFIREの視点から整理します。',
  alternates: {
    canonical: `${SITE_URL}/hitori-hojin/blog`,
  },
};

export default function HitoriHojinBlogPage({
  searchParams,
}: {
  searchParams: { series?: string };
}) {
  const posts = getAllHitoriHojinPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0F2A4A] mb-2">一人法人ブログ</h1>
      <p className="text-slate-500 mb-10">
        税金・社会保険・役員報酬・資産の置き場所など、一人法人特有の論点をFIREの視点から整理します。
      </p>

      {posts.length === 0 ? (
        <p className="text-slate-400">記事はまだありません。</p>
      ) : (
        <HitoriHojinBlogListClient posts={posts} series={searchParams.series} />
      )}
    </main>
  );
}
