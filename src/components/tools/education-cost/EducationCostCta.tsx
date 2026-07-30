'use client';

import Link from 'next/link';
import AffiliateLink from '@/components/AffiliateLink';
import { trackEvent } from '@/lib/gtag';

const SIMULATOR_HREF = '/app?utm_source=tools&utm_medium=referral&utm_campaign=education_cost_tool';

/**
 * シミュレーターへの導線を主役、アフィリエイトCTAを従とする既存の記事CTAルールと同じ方針。
 * 教育費に関する既存ブログ記事はまだ無いため、RelatedArticles(あわせて読みたい)は付けない
 * （FireAgeCta.tsxと同様、CTAボックス単体の構成）。
 */
export default function EducationCostCta() {
  return (
    <div className="w-full rounded-xl bg-slate-50 px-6 py-6 flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">
          この教育費のピークが資産形成にどう影響するか、本格シミュレーターの「ライフイベント」機能で確認できます
        </p>
        <Link
          href={SIMULATOR_HREF}
          onClick={() => trackEvent('tool_to_simulator_cta_click')}
          className="mt-3 w-full sm:w-auto inline-block bg-accent text-white font-bold text-center px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          → 資産シミュレーターで確認する
        </Link>
      </div>
      <p className="text-xs text-slate-400 text-center leading-relaxed">
        [PR]{' '}
        <AffiliateLink
          provider="matsui"
          landing="nisa"
          onClick={() => trackEvent('tool_to_nisa_cta_click')}
        />
      </p>
    </div>
  );
}
