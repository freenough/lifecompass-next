'use client';

import Link from 'next/link';
import { CONCERN_CTA_LABELS } from '@/lib/concernCtaLabels';
import { trackEvent } from '@/lib/gtag';
import { getBlogAsideLocation } from '@/lib/blogTracking';

// ブログ一覧の注目記事の下に置く、シミュレーターへの小さな導線カード。
// ボタンの文言はお悩みカード（シミュレーター本体行き）と表記を一致させる。
// ボタンはLPの濃紺CTAと同じトーン（ホバーで浮き上がる）。
export default function SimulatorCtaCard() {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-5">
      <p className="text-base font-bold text-slate-900">あなたのFIREは、何歳？</p>
      <Link
        href="/app"
        onClick={() => trackEvent('blog_cta_click', { location: getBlogAsideLocation() })}
        className="mt-4 block rounded bg-accent px-4 py-3 text-center text-sm font-semibold text-white shadow transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-none"
      >
        {CONCERN_CTA_LABELS.fullSimulator}
      </Link>
    </div>
  );
}
