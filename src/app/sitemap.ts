import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteConfig';

// titleは検索インデックス(search-index.json/route.ts)が固定ページを拾い出すためだけに使う
// (sitemap.xml自体はtitleを使わない)。空文字のエントリ(トップ・一覧ページ・ツール詳細)は
// 「独自のtitle/descriptionを持たない」または「別のデータソース(TOOLS等)から検索インデックス化
// されるため重複回避」のいずれかの理由で検索対象外(implementation_site_search.md 1-1節)。
export const STATIC_PATHS: { path: string; title: string }[] = [
  { path: '', title: '' },
  { path: '/app', title: '' },
  { path: '/blog', title: '' },
  { path: '/guide', title: '使い方ガイド' },
  { path: '/methodology', title: '計算ロジック・前提' },
  { path: '/disclosure', title: '広告・アフィリエイトに関する開示' },
  { path: '/privacy-policy', title: 'プライバシーポリシー' },
  { path: '/disclaimer', title: '免責事項' },
  { path: '/about', title: '運営者情報' },
  { path: '/tools', title: '' },
  { path: '/tools/monthly-investment', title: '' },
  { path: '/tools/fire-age', title: '' },
  { path: '/tools/compound', title: '' },
  { path: '/tools/pension-timing', title: '' },
  { path: '/tools/retirement-tax', title: '' },
  { path: '/tools/ideco-withdrawal', title: '' },
  { path: '/tools/education-cost', title: '' },
  { path: '/tools/prepay-vs-invest', title: '' },
  { path: '/concerns', title: 'お悩み一覧' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...postEntries];
}
