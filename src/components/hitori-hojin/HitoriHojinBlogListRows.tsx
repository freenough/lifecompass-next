'use client';

import { IconArrowRight } from '@tabler/icons-react';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_CATEGORIES } from '@/lib/hitoriHojinCategories';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';

// 画像枠付きカード版(HitoriHojinBlogListClient.tsx)の試験的な差し替え版。
// 左の画像枠を撤去し、カテゴリ単位のネイビー円アイコン+罫線区切りの一覧形式にする
// (docs/fixes/active/instruction_hitorihojin_blog_list_circle_icons.md)。
// 気に入らない場合は呼び出し元(hitori-hojin/blog/page.tsx)を元のコンポーネントに戻すだけで切り戻せる。
//
// seriesの受け渡し方針はHitoriHojinBlogListClient.tsxと同じ(useSearchParamsをSuspense境界内で
// 使うとSSR HTMLに一覧が含まれない問題を避けるため、サーバーコンポーネント側から渡す)。
export default function HitoriHojinBlogListRows({
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
    <ul className="divide-y divide-slate-200">
      {filteredPosts.map((post) => {
        const CategoryIcon = HITORI_HOJIN_CATEGORIES[post.category].ListIcon;
        return (
          <li key={post.slug}>
            <a href={`${HITORI_HOJIN_SITE_URL}/blog/${post.slug}`} className="block group">
              <article className="flex items-center gap-4 py-4">
                <div className="flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-600">
                  <CategoryIcon size={20} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <time className="text-xs text-slate-400 whitespace-nowrap">{post.date}</time>
                  <h2 className="text-base sm:text-lg font-bold text-[#0F2A4A] group-hover:text-blue-700 leading-snug line-clamp-2 mt-0.5">
                    {post.title}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mt-1">
                    {post.description}
                  </p>
                </div>
                <IconArrowRight
                  size={20}
                  className="text-slate-400 shrink-0 group-hover:text-blue-700 transition-colors"
                />
              </article>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
