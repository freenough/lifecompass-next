'use client';

import Link from 'next/link';
import AffiliateLink from '@/components/AffiliateLink';
import RelatedArticles from '@/components/tools/RelatedArticles';
import { trackEvent } from '@/lib/gtag';

const SIMULATOR_HREF = '/app?utm_source=tools&utm_medium=referral&utm_campaign=resident_tax_timing_tool';

/**
 * RetirementTaxCta.tsxと同一方針(シミュレーターへの導線を主役、アフィリエイトCTAを従とする)。
 */
export default function ResidentTaxTimingCta({ relatedArticles }: { relatedArticles: { title: string; href: string }[] }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full rounded-xl bg-slate-50 px-6 py-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">
            退職後に必要な現金の目安が分かったら、資産シミュレーターの支出イベントに転記すれば、
            他の資産状況・支出条件と合わせた退職後の資産推移を試算できます。
          </p>
          <Link
            href={SIMULATOR_HREF}
            onClick={() => trackEvent('tool_to_simulator_cta_click')}
            className="mt-2 w-full sm:w-auto inline-block bg-accent text-white font-bold text-center px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            → 資産シミュレーターで続きを試算する
          </Link>
        </div>
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          [PR]{' '}
          <AffiliateLink
            provider="matsui"
            landing="general"
            onClick={() => trackEvent('tool_to_nisa_cta_click')}
          />
        </p>
      </div>
      <RelatedArticles articles={relatedArticles} />
    </div>
  );
}
