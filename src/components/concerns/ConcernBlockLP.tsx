import Link from 'next/link';
import { CONCERNS } from '@/data/concerns';
import ConcernCard from './ConcernCard';

export default function ConcernBlockLP() {
  const featuredConcerns = CONCERNS.filter((c) => c.featured);

  return (
    <section className="bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-900">こんな悩みはありませんか?</h2>
          <p className="mt-2 text-sm text-slate-500">
            シミュレーターなら、悩みに具体的な数字で答えられます
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {featuredConcerns.map((concern) => (
            <ConcernCard key={concern.id} concern={concern} location="lp" />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/concerns" className="text-sm font-semibold hover:underline" style={{ color: '#334155' }}>
            その他のお悩みを見る →
          </Link>
        </div>
      </div>
    </section>
  );
}
