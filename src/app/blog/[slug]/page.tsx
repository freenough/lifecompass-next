import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug, getPostFaq, getRelatedPosts } from '@/lib/blog';
import { ORGANIZATION_REF, SITE_URL } from '@/lib/siteConfig';
import Breadcrumb from '@/components/layout/Breadcrumb';
import ArticleLinkTracker from '@/components/blog/ArticleLinkTracker';
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
    title: `${post.title} | FREENOUGH 資産シミュレーター`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${post.slug}`,
      // OGP画像はsrc/app/api/og/blog/[slug]/route.tsx（記事タイトルを動的描画）。
      // opengraph-image.tsxのファイル規約を使わない理由はそのRoute Handlerのコメント参照。
      images: [{ url: `${SITE_URL}/api/og/blog/${post.slug}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: [`${SITE_URL}/api/og/blog/${post.slug}`],
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

  const related = getRelatedPosts(post.slug, post.primaryTopic, post.topics);
  const faq = await getPostFaq(post.slug);

  // 更新日を別管理する仕組みが現状ないため、dateModifiedはdatePublishedと意図的に同値にしている
  // （docs/fixes/active/claude_instruction_structured_data_implementation_v2.md セクションC）。
  const datePublished = new Date(post.date).toISOString();
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    image: `${SITE_URL}/api/og/blog/${post.slug}`,
    datePublished,
    dateModified: datePublished,
    author: ORGANIZATION_REF,
    publisher: ORGANIZATION_REF,
  };
  const faqJsonLd =
    faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }
      : null;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      {/* layout.tsxの<main>の内側のため、入れ子にならないようdivにしている */}
      <div className="max-w-3xl mx-auto px-4 py-12">
      {/* パンくず（表示とBreadcrumbListのJSON-LDを同じ配列から出力。記事タイトルは表示のみ1行で省略） */}
      <div className="mb-8">
        <Breadcrumb
          items={[
            { name: '資産シミュレーター', href: '/' },
            { name: 'ブログ', href: '/blog' },
            { name: post.title, href: `/blog/${post.slug}` },
          ]}
          truncateLast
        />
      </div>

      {/* アイキャッチ画像 */}
      {post.eyecatch && (
        <div className="relative mb-8 aspect-[3/2] rounded-xl overflow-hidden">
          <Image
            src={post.eyecatch}
            alt={post.title}
            fill
            priority
            sizes="(min-width: 768px) 736px, 100vw"
            className="object-cover"
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

      {/* 記事本文。本文中のサイト内リンクのクリックはArticleLinkTrackerでGA4イベントとして計測する */}
      <ArticleLinkTracker postSlug={post.slug} section="blog">
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
      </ArticleLinkTracker>

      {/* CTA */}
      <div className="mt-12 bg-[#EFF6FF] border border-blue-100 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-500 mb-2">この記事を読んで気になった方へ</p>
        <h2 className="text-xl font-bold text-[#0F2A4A] mb-4">
          FREENOUGH 資産シミュレーターで<br />あなたのFIRE達成時期を試算する
        </h2>
        <p className="text-sm text-slate-500 mb-6">無料・登録不要・データは端末内に保存</p>
        <Link
          href="/app"
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
      </div>
    </>
  );
}
