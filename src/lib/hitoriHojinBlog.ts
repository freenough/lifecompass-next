import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { BASE_PATH, withBasePath } from '@/lib/siteConfig';

const POSTS_DIR = path.join(process.cwd(), 'src/content/hitori-hojin-blog');

export interface HitoriHojinBlogPostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: 'knowledge' | 'consider';
  series?: string;
  seriesOrder?: number;
  excerpt?: string;
  eyecatch?: string;
}

export interface HitoriHojinBlogPost extends HitoriHojinBlogPostMeta {
  content: string;
}

/**
 * Markdown本文をHTML化した後の後処理。src/lib/blog.tsのapplyBasePathToHtml()と同じ役割だが、
 * hitori-hojin側は既存blog.tsをimportしない独立実装のため複製している。画像srcだけでなく
 * 内部リンクhrefにも必ずbasePathを付与すること(既知バグ再発防止、
 * docs/fixes/active/2026-08-16_hitori-hojin-implementation.md 4節参照)。
 */
function applyBasePathToHitoriHojinHtml(html: string): string {
  return html
    .replace(/src="\/images\//g, `src="${BASE_PATH}/images/`)
    .replace(/href="\/(?!\/|asset-simulator\b)/g, `href="${BASE_PATH}/`);
}

function readMeta(filename: string): HitoriHojinBlogPostMeta {
  const slug = filename.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');
  const { data } = matter(raw);
  return {
    slug: data.slug ?? slug,
    title: data.title ?? '',
    date: data.date ?? '',
    description: data.description ?? '',
    category: data.category ?? 'knowledge',
    series: data.series,
    seriesOrder: data.seriesOrder,
    excerpt: data.excerpt,
    eyecatch: withBasePath(data.eyecatch),
  };
}

export function getAllHitoriHojinPosts(): HitoriHojinBlogPostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  return files.map(readMeta).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getHitoriHojinPostsBySeries(series: string): HitoriHojinBlogPostMeta[] {
  return getAllHitoriHojinPosts()
    .filter((post) => post.series === series)
    .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999));
}

export async function getHitoriHojinPostBySlug(slug: string): Promise<HitoriHojinBlogPost | null> {
  const filepath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, 'utf-8');
  const { data, content: markdown } = matter(raw);
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: true })
    .process(markdown);
  return {
    slug: data.slug ?? slug,
    title: data.title ?? '',
    date: data.date ?? '',
    description: data.description ?? '',
    category: data.category ?? 'knowledge',
    series: data.series,
    seriesOrder: data.seriesOrder,
    excerpt: data.excerpt,
    eyecatch: withBasePath(data.eyecatch),
    content: applyBasePathToHitoriHojinHtml(processed.toString()),
  };
}
