import Link from 'next/link';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';

export default function HitoriHojinArticleCard({ post }: { post: HitoriHojinBlogPostMeta }) {
  return (
    <Link
      href={`/hitori-hojin/blog/${post.slug}`}
      className="rounded-xl border border-slate-200 bg-white shadow-sm flex overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="relative w-[190px] aspect-[3/2] shrink-0 self-center overflow-hidden bg-slate-100">
        {post.eyecatch && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.eyecatch}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 p-[14px] flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-3">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500">{post.excerpt ?? post.description}</p>
      </div>
    </Link>
  );
}
