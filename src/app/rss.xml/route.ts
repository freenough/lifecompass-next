import { getAllPosts, buildRssFeed } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteConfig';

export async function GET() {
  const posts = getAllPosts();
  const feed = buildRssFeed(posts, SITE_URL);
  return new Response(feed, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
