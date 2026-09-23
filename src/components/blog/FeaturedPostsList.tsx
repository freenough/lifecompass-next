'use client';

import Link from 'next/link';
import SectionRule from '@/components/layout/SectionRule';
import type { FeaturedPost } from '@/lib/featuredPosts';
import { trackEvent } from '@/lib/gtag';
import { getBlogAsideLocation } from '@/lib/blogTracking';

// ブログ一覧の注目記事（番号＋タイトルのみ。画像・カテゴリ・説明文は出さない）。
// 見出しはh2：記事カードのタイトル（h2）と同じく、ページのh1直下のまとまりとして扱う
// （claude_instruction_blog_list_implementation.md 3節）。
export default function FeaturedPostsList({ posts }: { posts: FeaturedPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="featured-posts-heading">
      <div className="mb-2 flex items-center gap-3">
        <SectionRule />
        <h2 id="featured-posts-heading" className="text-sm font-bold text-slate-900">
          注目記事
        </h2>
      </div>
      <ol className="divide-y divide-slate-200 border-y border-slate-200">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              onClick={() =>
                trackEvent('blog_post_click', {
                  post_slug: post.slug,
                  location: getBlogAsideLocation(),
                  position: i + 1,
                })
              }
              className="group flex gap-3 py-3"
            >
              <span className="w-4 shrink-0 text-sm font-bold text-slate-400 tabular-nums">{i + 1}</span>
              <span className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2 [line-break:strict] group-hover:text-blue-700">
                {post.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
