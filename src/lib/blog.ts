import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import { defaultSchema } from 'hast-util-sanitize';
import type { Root, Html, Parent, Node } from 'mdast';
import type { Handler, Handlers } from 'mdast-util-to-hast';
import type { Element } from 'hast';
import { BASE_PATH, SITE_URL, withBasePath } from '@/lib/siteConfig';
import { getAffiliateLink } from '@/lib/affiliateLinks';

const POSTS_DIR = path.join(process.cwd(), 'src/content/blog');

const AFFILIATE_TAG_RE = /^<AffiliateLink\s+provider="([^"]+)"\s+landing="([^"]+)"\s*\/>$/;

// remark-html はデフォルトでhast-util-sanitizeのdefaultSchemaを使い、<a>にはhref以外の
// 属性(target・rel等)を許可しない。AffiliateLinkが生成する<a target="_blank" rel="...">が
// 属性ごと剥がされないよう、<a>の許可属性リストにtarget・relだけを追加する
// （サイト全体のサニタイズを無効化するsanitize:falseは使わない。<a>以外の要素・属性の
// 扱いはdefaultSchemaのまま = <script>等の意図しない生HTMLは引き続き除去される）。
// remarkImageCaption()が生成する<p class="img-caption">のclassNameもデフォルトschemaでは
// 剥がされる（defaultSchemaの属性ホワイトリストにclassNameがグローバルに含まれていないため）。
// AffiliateLinkのtarget/relと同様、pタグにclassNameだけを追加で許可する。
const affiliateLinkSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
    p: [...(defaultSchema.attributes?.p ?? []), 'className'],
  },
};

interface AffiliateLinkNode extends Node {
  type: 'affiliateLink';
  url: string;
  text: string;
}

// AffiliateLinkNodeをそのまま<a>のhast要素へ変換するハンドラ。generic'html'ノードの
// 経路(allowDangerousHtml必須)を通さないため、defaultSchemaベースのsanitizeスキーマの
// もとでも正しく<a>要素として出力される。
const affiliateLinkHandler: Handler = (_state, node) => {
  const n = node as AffiliateLinkNode;
  const element: Element = {
    type: 'element',
    tagName: 'a',
    properties: { href: n.url, target: '_blank', rel: 'sponsored noopener noreferrer' },
    children: [{ type: 'text', value: n.text }],
  };
  return element;
};

const affiliateLinkHandlers: Handlers = {
  affiliateLink: affiliateLinkHandler,
} as Handlers;

function isParentWithChildren(node: unknown): node is Parent {
  return typeof node === 'object' && node !== null && Array.isArray((node as Parent).children);
}

/**
 * `<AffiliateLink provider="..." landing="..." />` という記法を検出し、
 * affiliateLinks.tsの対応表に基づいてaffiliateLinkノード(上記ハンドラで<a>に変換される)
 * に置き換える。remarkはこの記法を生HTML(html型ノード)としてパースするだけなので、
 * mdast変換の段階でここで独自ノードに差し替える。
 */
function remarkAffiliateLink() {
  return (tree: Root) => {
    const visit = (node: Parent) => {
      node.children.forEach((child, index) => {
        if (child.type === 'html') {
          const htmlNode = child as Html;
          const match = AFFILIATE_TAG_RE.exec(htmlNode.value.trim());
          if (match) {
            const [, provider, landing] = match;
            const entry = getAffiliateLink(provider, landing);
            if (entry) {
              const replacement: AffiliateLinkNode = { type: 'affiliateLink', url: entry.url, text: entry.text };
              node.children[index] = replacement as unknown as Parent['children'][number];
            } else {
              console.warn(
                `[AffiliateLink] 未登録の provider="${provider}" landing="${landing}" が指定されています。該当箇所はレンダリングされません。`
              );
              htmlNode.value = '';
            }
          }
        }
        if (isParentWithChildren(child)) visit(child);
      });
    };
    visit(tree);
  };
}

/**
 * 画像の直後に置かれた「イタリックのみで構成された1行の段落」をキャプションとして検出し、
 * <p class="img-caption">として出力されるようにする（instruction_blog_image_caption_style.md）。
 * 誤検出防止のため、以下2条件を両方満たす場合のみ適用する（通常の本文イタリックには影響しない）:
 * - 直前の兄弟ノードが「imageノード1つのみで構成されたparagraph」（画像だけの段落）
 * - 対象のparagraph自体が「emphasisノード1つのみで構成」（イタリックだけの1行）
 * mdast-util-to-hastはnode.data.hName/hPropertiesを見て標準ノードの変換結果を上書きできるため、
 * 新しいノード型は作らず、対象paragraphのdataにhName:'p'・class名だけを設定する。
 */
function remarkImageCaption() {
  return (tree: Root) => {
    const visit = (node: Parent) => {
      const children = node.children;
      for (let i = 1; i < children.length; i++) {
        const prev = children[i - 1];
        const cur = children[i];
        const prevIsImageOnlyParagraph =
          prev.type === 'paragraph' && prev.children.length === 1 && prev.children[0].type === 'image';
        const curIsItalicOnlyParagraph =
          cur.type === 'paragraph' && cur.children.length === 1 && cur.children[0].type === 'emphasis';
        if (prevIsImageOnlyParagraph && curIsItalicOnlyParagraph) {
          cur.data = {
            ...cur.data,
            hName: 'p',
            hProperties: { className: ['img-caption'] },
          };
        }
      }
      children.forEach(child => { if (isParentWithChildren(child)) visit(child); });
    };
    visit(tree);
  };
}

/**
 * Markdown本文をHTML化した後の後処理。記事本文はbasePath導入前に書かれたものが
 * 大半のため、執筆者がbasePathを意識せず書けるよう、ここで一括変換する
 * （個々のMarkdownファイルを手で書き換えると置換漏れ・表記揺れが起きるため）。
 * - ルート相対の画像パス（例: src="/images/..."）にbasePathを付与
 * - 記事内CTAリンクの.vercel.app直リンクを正規ドメイン（SITE_URL）に統一
 * - CTAリンクの旧ルート名(/simulator)を現行ルート名(/app)に統一
 */
function applyBasePathToHtml(html: string): string {
  return html
    .replace(/src="\/images\//g, `src="${BASE_PATH}/images/`)
    .replace(/https:\/\/freenough-lifecompass\.vercel\.app\//g, `${SITE_URL}/`)
    .split(`${SITE_URL}/simulator`).join(`${SITE_URL}/app`);
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
  // 関連コンテンツのマッチング用タクソノミー（getRelatedPosts()・getRelatedPostsForTopics()参照）
  primaryTopic: string;
  topics: string[];
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
      primaryTopic: data.primaryTopic ?? '',
      topics:      data.topics ?? [],
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
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkAffiliateLink)
    .use(remarkImageCaption)
    .use(remarkHtml, { sanitize: affiliateLinkSchema, handlers: affiliateLinkHandlers })
    .process(markdown);
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
    primaryTopic: data.primaryTopic ?? '',
    topics:      data.topics ?? [],
    content:     applyBasePathToHtml(processed.toString()),
  };
}

/**
 * 「共有topics数」でスコアリングし、同スコアの場合はprimaryTopic一致 → date降順でタイブレークする。
 * 共有topicsが0件の候補は除外する（無関係なコンテンツを無理に表示しない）。
 */
export function getRelatedPosts(
  currentSlug: string,
  primaryTopic: string,
  topics: string[],
  limit = 3
): BlogPostMeta[] {
  const topicSet = new Set(topics);
  return getAllPosts()
    .filter((p) => p.slug !== currentSlug)
    .map((post) => ({ post, score: post.topics.filter((t) => topicSet.has(t)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aMatch = a.post.primaryTopic === primaryTopic ? 1 : 0;
      const bMatch = b.post.primaryTopic === primaryTopic ? 1 : 0;
      if (bMatch !== aMatch) return bMatch - aMatch;
      return a.post.date < b.post.date ? 1 : -1;
    })
    .slice(0, limit)
    .map(({ post }) => post);
}

/**
 * Tools側からの「topicsが交差するブログ記事」検索用（currentSlug・primaryTopicタイブレークなし版）。
 * スコア降順→date降順のみでソートする。
 */
export function getRelatedPostsForTopics(topics: string[], limit = 3): BlogPostMeta[] {
  const topicSet = new Set(topics);
  return getAllPosts()
    .map((post) => ({ post, score: post.topics.filter((t) => topicSet.has(t)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : (a.post.date < b.post.date ? 1 : -1)))
    .slice(0, limit)
    .map(({ post }) => post);
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
