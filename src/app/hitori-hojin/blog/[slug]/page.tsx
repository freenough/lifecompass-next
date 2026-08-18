import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAllHitoriHojinPosts, getHitoriHojinPostBySlug } from '@/lib/hitoriHojinBlog';
import { HITORI_HOJIN_CATEGORIES } from '@/lib/hitoriHojinCategories';
import { SITE_URL } from '@/lib/siteConfig';

export async function generateStaticParams() {
  return getAllHitoriHojinPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getHitoriHojinPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | 一人法人ブログ`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/hitori-hojin/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `${SITE_URL}/hitori-hojin/blog/${post.slug}`,
    },
  };
}

export default async function HitoriHojinBlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getHitoriHojinPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* パンくず */}
      <nav className="text-sm text-slate-400 mb-8 flex items-center gap-1">
        <Link href="/hitori-hojin" className="hover:text-[#0F2A4A]">一人法人</Link>
        <span>›</span>
        <Link href="/hitori-hojin/blog" className="hover:text-[#0F2A4A]">ブログ</Link>
        <span>›</span>
        <span className="text-slate-600 truncate max-w-[200px]">{post.title}</span>
      </nav>

      {/* アイキャッチ画像 */}
      {post.eyecatch && (
        <div className="mb-8 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.eyecatch} alt={post.title} className="w-full object-cover" />
        </div>
      )}

      {/* 記事ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium bg-[#EFF6FF] text-[#0F2A4A] px-2 py-0.5 rounded-full">
            {HITORI_HOJIN_CATEGORIES[post.category].label}
          </span>
          <time className="text-xs text-slate-400">{post.date}</time>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F2A4A] leading-snug mb-4">
          {post.title}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">{post.description}</p>
      </div>

      <hr className="border-slate-200 mb-8" />

      {/* 記事本文(記事内に既にCTAリンクが含まれているため、末尾に別途CTAブロックは追加しない) */}
      <article
        className="prose prose-lg max-w-none
          prose-headings:text-[#0F2A4A] prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-slate-700 prose-p:leading-relaxed
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-[#0F2A4A]
          prose-table:text-sm
          prose-th:bg-[#0F2A4A] prose-th:text-white prose-th:p-2
          prose-td:p-2 prose-td:border prose-td:border-slate-200
          prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:text-[#0F2A4A] prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-lg
          prose-blockquote:border-l-4 prose-blockquote:border-blue-300 prose-blockquote:text-slate-500"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </main>
  );
}
