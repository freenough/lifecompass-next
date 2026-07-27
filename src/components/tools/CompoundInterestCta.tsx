'use client';

import Link from 'next/link';
import AffiliateLink from '@/components/AffiliateLink';
import { trackEvent } from '@/lib/gtag';

const SIMULATOR_HREF = '/app?utm_source=tools&utm_medium=referral&utm_campaign=compound_interest_tool';

/**
 * シミュレーターへの導線を主役、アフィリエイトCTAを従とする既存の記事CTAルールと同じ方針。
 * 第1弾・第2弾と完全に同一の構成（CTA1つ+直下に[PR]アフィリエイトリンク）。
 */
export default function CompoundInterestCta() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">
          この試算はシンプルな複利計算のみです。税金・NISA枠上限・取り崩し後の資産寿命まで含めて確認したい方は本格シミュレーターへ
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
          landing="nisa"
          onClick={() => trackEvent('tool_to_nisa_cta_click')}
        />
      </p>
    </div>
  );
}
