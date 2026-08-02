import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { CONCERNS, STAGE_LABELS, STAGE_ORDER } from '@/data/concerns';
import ConcernCard from '@/components/concerns/ConcernCard';

export const metadata: Metadata = {
  title: 'お悩み一覧 | FREENOUGH 資産シミュレーター',
  description: 'よくある悩みと、シミュレーターで分かることをまとめました。',
  alternates: {
    canonical: `${SITE_URL}/concerns`,
  },
};

export default function ConcernsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2A4A] leading-snug">お悩み一覧</h1>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">
        よくある悩みと、シミュレーターで分かることをまとめました
      </p>

      {STAGE_ORDER.map((stage) => (
        <div key={stage} className="mt-10 first:mt-8">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">{STAGE_LABELS[stage]}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {CONCERNS.filter((c) => c.stage === stage).map((concern) => (
              <ConcernCard key={concern.id} concern={concern} location="concerns_list" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
