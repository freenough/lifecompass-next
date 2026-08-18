import Link from 'next/link';
import type { HitoriHojinBlogPostMeta } from '@/lib/hitoriHojinBlog';
import HitoriHojinArticleCard from './HitoriHojinArticleCard';

interface HitoriHojinContentSectionProps {
  title: string;
  subtitle?: string;
  items: HitoriHojinBlogPostMeta[];
  footerLink?: { label: string; href: string };
}

export default function HitoriHojinContentSection({
  title,
  subtitle,
  items,
  footerLink,
}: HitoriHojinContentSectionProps) {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <HitoriHojinArticleCard key={item.slug} post={item} />
          ))}
        </div>

        {footerLink && (
          <div className="mt-10 text-center">
            <Link href={footerLink.href} className="text-sm font-semibold hover:underline" style={{ color: '#334155' }}>
              {footerLink.label} →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
