import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

const POSTS_DIR = path.join(process.cwd(), 'src/content/blog');

export interface BlogPostMeta {
  title: string;
  date: string;
  slug: string;
  category: string;
  description: string;
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
    } as BlogPostMeta;
  });
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
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
    content:     processed.toString(),
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
    <title>LifeCompass ブログ</title>
    <link>${siteUrl}/blog</link>
    <description>FIREと資産形成の情報を発信</description>
    <language>ja</language>
    ${items}
  </channel>
</rss>`;
}
