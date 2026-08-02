'use client';

import Link from 'next/link';
import type { Concern } from '@/data/concerns';
import { trackEvent } from '@/lib/gtag';

interface ConcernCardProps {
  concern: Concern;
  location: 'lp' | 'concerns_list';
}

export default function ConcernCard({ concern, location }: ConcernCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <h3 className="text-base font-semibold text-slate-900">{concern.question}</h3>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">{concern.outcome}</p>
      {/* CTAとの視覚的な強弱関係(悩みCTA>詳しく読む)を保ちつつ、Hero CTAの塗りボタンとは
          差別化するため枠線ボタンにする。PC幅ではCTAと「詳しく読む」を横並びにする。 */}
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          href={concern.ctaUrl}
          onClick={() =>
            trackEvent('concern_cta_click', {
              concern_id: concern.id,
              stage: concern.stage,
              cta_type: concern.ctaType,
              location,
            })
          }
          className="w-full sm:w-auto text-center border-2 border-accent text-accent font-bold px-6 py-2.5 rounded-lg hover:bg-accent/10 transition-colors"
        >
          {concern.ctaLabel}
        </Link>
        {concern.articleUrl && (
          <Link
            href={concern.articleUrl}
            onClick={() =>
              trackEvent('concern_article_click', {
                concern_id: concern.id,
                stage: concern.stage,
                location,
              })
            }
            className="text-xs font-medium text-slate-500 hover:underline text-center sm:text-left"
          >
            詳しく読む →
          </Link>
        )}
      </div>
    </div>
  );
}
