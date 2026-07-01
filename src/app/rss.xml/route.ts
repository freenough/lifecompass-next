import { getAllPosts, buildRssFeed } from '@/lib/blog';

export async function GET() {
  const posts = getAllPosts();
  const siteUrl = 'https://freenough-lifecompass.vercel.app';
  const feed = buildRssFeed(posts, siteUrl);
  return new Response(feed, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
