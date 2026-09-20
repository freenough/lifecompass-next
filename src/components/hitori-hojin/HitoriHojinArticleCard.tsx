import Image from 'next/image';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_SITE_URL } from '@/lib/siteConfig';

export default function HitoriHojinArticleCard({ post }: { post: HitoriHojinBlogPostMeta }) {
  return (
    <a
      href={`${HITORI_HOJIN_SITE_URL}/blog/${post.slug}`}
      className="rounded-xl border border-slate-200 bg-white shadow-sm flex overflow-hidden hover:shadow-md hover:border-slate-300 transition-all"
    >
      <div className="relative w-[190px] aspect-[3/2] shrink-0 self-center overflow-hidden bg-slate-100">
        {post.eyecatch && (
          <Image
            src={post.eyecatch}
            alt={post.title}
            fill
            sizes="190px"
            className="object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 p-[14px] flex flex-col gap-1">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-3">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500">{post.excerpt ?? post.description}</p>
      </div>
    </a>
  );
}
