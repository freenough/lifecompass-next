import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { BASE_PATH, SITE_URL, withBasePath } from '@/lib/siteConfig';

const POSTS_DIR = path.join(process.cwd(), 'src/content/blog');

/**
 * Markdown本文をHTML化した後の後処理。記事本文はbasePath導入前に書かれたものが
 * 大半のため、執筆者がbasePathを意識せず書けるよう、ここで一括変換する
 * （個々のMarkdownファイルを手で書き換えると置換漏れ・表記揺れが起きるため）。
 * - ルート相対の画像パス（例: src="/images/..."）にbasePathを付与
 * - 記事内CTAリンクの.vercel.app直リンクを正規ドメイン（SITE_URL）に統一
 */
function applyBasePathToHtml(html: string): string {
  return html
    .replace(/src="\/images\//g, `src="${BASE_PATH}/images/`)
    .replace(/https:\/\/freenough-lifecompass\.vercel\.app\//g, `${SITE_URL}/`);
}

export interface BlogPostMeta {
  title: string;
  date: string;
  slug: string;
  category: string;
  description: string;
  eyecatch?: string;
  // LP「FIREガイド」セクション用（既存のdescriptionは長文でblog一覧・記事ヘッダー用途のため、
  // 短い一言説明として別フィールドにする）
  excerpt?: string;
  tags?: string[];
  featured?: boolean;
  priority?: number;
  readingTime?: number;
}

export interface BlogPost extends BlogPostMeta {
  content: string;
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  const posts = files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf-8');
    const { data } = matter(raw);
    return {
      title:       data.title       ?? '',
      date:        data.date        ?? '',
      slug:        data.slug        ?? slug,
      category:    data.category    ?? '',
      description: data.description ?? '',
      eyecatch:    withBasePath(data.eyecatch),
      excerpt:     data.excerpt,
      tags:        data.tags,
      featured:    data.featured,
      priority:    data.priority,
      readingTime: data.readingTime,
    } as BlogPostMeta;
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * LP「FIREガイド」セクションに表示する記事。featured: trueの記事のみ、priority昇順で返す。
 * 最新順ソートは意図的に不採用（SEO記事が増えてもLPの見え方を安定させるため）。
 */
export function getFeaturedPosts(): BlogPostMeta[] {
  return getAllPosts()
    .filter((post) => post.featured === true)
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const filepath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, 'utf-8');
  const { data, content: markdown } = matter(raw);
  const processed = await remark().use(remarkGfm).use(remarkHtml).process(markdown);
  return {
    title:       data.title       ?? '',
    date:        data.date        ?? '',
    slug:        data.slug        ?? slug,
    category:    data.category    ?? '',
    description: data.description ?? '',
    eyecatch:    withBasePath(data.eyecatch),
    excerpt:     data.excerpt,
    tags:        data.tags,
    featured:    data.featured,
    priority:    data.priority,
    readingTime: data.readingTime,
    content:     applyBasePathToHtml(processed.toString()),
  };
}

export function getRelatedPosts(currentSlug: string, category: string, limit = 3): BlogPostMeta[] {
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug && p.category === category)
    .slice(0, limit);
}

export function buildRssFeed(posts: BlogPostMeta[], siteUrl: string): string {
  const items = posts
    .map(
      (p) => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${siteUrl}/blog/${p.slug}</link>
      <guid>${siteUrl}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description><![CDATA[${p.description}]]></description>
    </item>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>FREENOUGH 資産シミュレーター ブログ</title>
    <link>${siteUrl}/blog</link>
    <description>FIREと資産形成の情報を発信</description>
    <language>ja</language>
    ${items}
  </channel>
</rss>`;
}
