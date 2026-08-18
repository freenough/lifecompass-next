import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { getAllHitoriHojinPosts } from '@/lib/hitoriHojinBlog';
import { PUBLISHED_TOOLS } from '@/lib/toolMetadata';
import { SITE_URL } from '@/lib/siteConfig';

// titleは検索インデックス(search-index.json/route.ts)が固定ページを拾い出すためだけに使う
// (sitemap.xml自体はtitleを使わない)。空文字のエントリ(トップ・一覧ページ・ツール詳細)は
// 「独自のtitle/descriptionを持たない」または「別のデータソース(TOOLS等)から検索インデックス化
// されるため重複回避」のいずれかの理由で検索対象外(implementation_site_search.md 1-1節)。
// ツール個別ページ(/tools/{slug})はPUBLISHED_TOOLSから動的生成するため、ここには含めない
// (/disclosure/oldは意図的に除外されている固定ページであり、対象外)。
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
  { path: '/concerns', title: 'お悩み一覧' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const toolEntries: MetadataRoute.Sitemap = PUBLISHED_TOOLS.map((tool) => ({
    url: `${SITE_URL}${tool.href}`,
    lastModified: new Date(),
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  // hitori-hojin(一人法人)関連URL。既存ロジックには影響しない別変数として追加。
  const hitoriHojinEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/hitori-hojin`, lastModified: new Date() },
    { url: `${SITE_URL}/hitori-hojin/blog`, lastModified: new Date() },
  ];
  const hitoriHojinPostEntries: MetadataRoute.Sitemap = getAllHitoriHojinPosts().map((post) => ({
    url: `${SITE_URL}/hitori-hojin/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...toolEntries, ...postEntries, ...hitoriHojinEntries, ...hitoriHojinPostEntries];
}
