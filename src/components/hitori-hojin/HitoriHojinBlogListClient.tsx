'use client';

import Link from 'next/link';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';

// seriesはサーバーコンポーネント(hitori-hojin/blog/page.tsx)がNext.jsのsearchParams propから
// 受け取って渡す(useSearchParamsフックはSuspense境界内で使うとサーバー側では
// フォールバックのみが描画され、記事一覧がSSR HTMLに含まれずクライアント描画待ちの
// 空白状態になるため採用しない)。
export default function HitoriHojinBlogListClient({
  posts,
  series,
}: {
  posts: HitoriHojinBlogPostMeta[];
  series?: string;
}) {
  const filteredPosts = series
    ? posts
        .filter((post) => post.series === series)
        .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999))
    : posts;

  if (filteredPosts.length === 0) {
    return <p className="text-slate-400">該当する記事がありません。</p>;
  }

  return (
    <ul className="space-y-4">
      {filteredPosts.map((post) => (
        <li key={post.slug}>
          <Link href={`/hitori-hojin/blog/${post.slug}`} className="block group">
            <article className="flex gap-3 border border-slate-200 rounded-xl p-3 hover:shadow-md transition-shadow">
              <div className="relative w-[100px] sm:w-[120px] lg:w-[130px] aspect-[3/2] shrink-0 self-start overflow-hidden rounded-lg bg-slate-100">
                {post.eyecatch && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.eyecatch}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <time className="text-xs text-slate-400 shrink-0 whitespace-nowrap">{post.date}</time>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F2A4A] group-hover:text-blue-700 leading-snug line-clamp-2 min-h-[44px] sm:min-h-[49.5px]">
                  {post.title}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-1 min-h-[45.5px]">
                  {post.description}
                </p>
              </div>
            </article>
          </Link>
        </li>
      ))}
    </ul>
  );
}
