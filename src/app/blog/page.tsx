import { getAllPosts } from '@/lib/blog';
import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { BLOG_DESCRIPTION } from '@/lib/siteCopy';
import BlogListClient from '@/components/blog/BlogListClient';

export const metadata: Metadata = {
  title: 'ブログ | FREENOUGH 資産シミュレーター',
  description: BLOG_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0F2A4A] mb-2">ブログ</h1>
      <p className="text-slate-500 mb-10">{BLOG_DESCRIPTION}</p>

      {posts.length === 0 ? (
        <p className="text-slate-400">記事はまだありません。</p>
      ) : (
        <BlogListClient posts={posts} />
      )}
    </main>
  );
}
