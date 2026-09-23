import type { BlogPostMeta } from '@/lib/blog';

// 注目記事（ブログ一覧サイドバー用）。表示順に並べる。
// LPの「FIREガイド」（blog.ts の featured / priority）とは独立して管理する。
export const FEATURED_POST_SLUGS = [
  'sequence-of-returns-risk',
  'withdrawal-strategy-comparison',
  'semi-retirement-blank-period',
  'nisa-monthly-investment',
] as const;

export interface FeaturedPost {
  slug: string;
  title: string;
}

// FEATURED_POST_SLUGSを記事データに突き合わせる。存在しないslugは表示せずに読み飛ばし、
// dev環境では（サーバー側の）コンソールに警告を出す。
export function resolveFeaturedPosts(posts: BlogPostMeta[]): FeaturedPost[] {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  return FEATURED_POST_SLUGS.flatMap((slug) => {
    const post = bySlug.get(slug);
    if (!post) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[featuredPosts] 存在しないslug "${slug}" を読み飛ばしました（FEATURED_POST_SLUGSを確認してください）`);
      }
      return [];
    }
    return [{ slug: post.slug, title: post.title }];
  });
}
