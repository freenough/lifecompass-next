import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug, getRelatedPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteConfig';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | LifeCompass`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      images: [{ url: '/images/ogp.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['/images/ogp.png'],
    },
    alternates: {
      canonical: `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post.slug, post.category);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* パンくず */}
      <nav className="text-sm text-slate-400 mb-8 flex items-center gap-1">
        <Link href="/" className="hover:text-[#0F2A4A]">Home</Link>
        <span>›</span>
        <Link href="/blog" className="hover:text-[#0F2A4A]">Blog</Link>
        <span>›</span>
        <span className="text-slate-600 truncate max-w-[200px]">{post.title}</span>
      </nav>

      {/* アイキャッチ画像 */}
      {post.eyecatch && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img
            src={post.eyecatch}
            alt={post.title}
            className="w-full object-cover"
          />
        </div>
      )}

      {/* 記事ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium bg-[#EFF6FF] text-[#0F2A4A] px-2 py-0.5 rounded-full">
            {post.category}
          </span>
          <time className="text-xs text-slate-400">{post.date}</time>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0F2A4A] leading-snug mb-4">
          {post.title}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">{post.description}</p>
      </div>

      <hr className="border-slate-200 mb-8" />

      {/* 記事本文 */}
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

      {/* CTA */}
      <div className="mt-12 bg-[#EFF6FF] border border-blue-100 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-500 mb-2">この記事を読んで気になった方へ</p>
        <h2 className="text-xl font-bold text-[#0F2A4A] mb-4">
          LifeCompassで<br />あなたのFIRE達成時期をシミュレーションする
        </h2>
        <p className="text-sm text-slate-500 mb-6">無料・登録不要・データは端末内に保存</p>
        <Link
          href="/simulator"
          className="inline-block bg-[#0F2A4A] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          無料で試す →
        </Link>
      </div>

      {/* 関連記事 */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-[#0F2A4A] mb-4">関連記事</h2>
          <ul className="space-y-4">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="flex items-start gap-3 group p-4 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <span className="text-xs bg-[#EFF6FF] text-[#0F2A4A] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    {r.category}
                  </span>
                  <span className="text-sm font-medium text-[#0F2A4A] group-hover:text-blue-700 leading-snug">
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
