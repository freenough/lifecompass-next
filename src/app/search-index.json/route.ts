import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/blog';
import { TOOLS } from '@/lib/toolMetadata';
import { STATIC_PATHS } from '@/app/sitemap';

export interface SearchIndexItem {
  type: 'blog' | 'tool' | 'page';
  title: string;
  description: string;
  url: string; // basePathを含めない相対パス(next/linkの自動付与と同じ慣習)
  category?: string;
  keywords: string[];
  // 空クエリ時の「注目」表示(SearchModal.tsx)がgetAllPosts()のfeaturedを直接参照できない
  // (クライアント側はこのJSON経由でしかデータを持たないため)、blogアイテムにのみ引き継ぐ。
  featured?: boolean;
}

export async function GET() {
  const blogItems: SearchIndexItem[] = getAllPosts().map((post) => ({
    type: 'blog',
    title: post.title,
    description: post.excerpt ?? post.description,
    url: `/blog/${post.slug}`,
    category: post.category,
    keywords: post.topics,
    featured: post.featured === true,
  }));

  const toolItems: SearchIndexItem[] = TOOLS.map((tool) => ({
    type: 'tool',
    title: tool.title,
    description: tool.description,
    url: tool.href,
    keywords: tool.topics,
  }));

  const pageItems: SearchIndexItem[] = STATIC_PATHS.filter((p) => p.title !== '').map((p) => ({
    type: 'page',
    title: p.title,
    description: '',
    url: p.path,
    keywords: [],
  }));

  const items: SearchIndexItem[] = [...toolItems, ...blogItems, ...pageItems];

  return NextResponse.json(items);
}
