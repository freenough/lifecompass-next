import AdSlot from '@/components/layout/AdSlot';

export const metadata = { title: 'ブログ — LifeCompass' };

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">ブログ</h1>
      <p className="text-slate-500">記事は準備中です。しばらくお待ちください。</p>
      <AdSlot slotId="blog-top" className="mt-8" />
    </div>
  );
}
