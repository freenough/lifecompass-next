import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/siteConfig';

const STATIC_PATHS = [
  '',
  '/app',
  '/blog',
  '/guide',
  '/methodology',
  '/disclosure',
  '/privacy-policy',
  '/disclaimer',
  '/about',
  '/tools',
  '/tools/monthly-investment',
  '/tools/fire-age',
  '/tools/compound',
  '/tools/pension-timing',
  '/tools/retirement-tax',
  '/tools/ideco-withdrawal',
  '/tools/education-cost',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: new Date(),
  }));

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [...staticEntries, ...postEntries];
}
