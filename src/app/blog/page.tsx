import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ブログ | LifeCompass',
  description: 'FIREと資産形成に関する記事を発信しています。',
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[#0F2A4A] mb-2">ブログ</h1>
      <p className="text-slate-500 mb-10">FIREと資産形成の情報を発信しています。</p>

      {posts.length === 0 ? (
        <p className="text-slate-400">記事はまだありません。</p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <article className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium bg-[#EFF6FF] text-[#0F2A4A] px-2 py-0.5 rounded-full">
                      {post.category}
                    </span>
                    <time className="text-xs text-slate-400">{post.date}</time>
                  </div>
                  <h2 className="text-lg font-bold text-[#0F2A4A] group-hover:text-blue-700 mb-2 leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{post.description}</p>
                  <span className="text-sm text-blue-600 font-medium group-hover:underline">
                    続きを読む →
                  </span>
                </article>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
