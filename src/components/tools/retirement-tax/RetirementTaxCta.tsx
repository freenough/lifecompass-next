'use client';

import Link from 'next/link';
import AffiliateLink from '@/components/AffiliateLink';
import RelatedArticles from '@/components/tools/RelatedArticles';
import { trackEvent } from '@/lib/gtag';

const SIMULATOR_HREF = '/app?utm_source=tools&utm_medium=referral&utm_campaign=retirement_tax_tool';

/**
 * シミュレーターへの導線を主役、アフィリエイトCTAを従とする既存の記事CTAルールと同じ方針。
 * 第1〜4弾と完全に同一の構成(CTA1つ+直下に[PR]アフィリエイトリンク)。
 */
export default function RetirementTaxCta() {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full rounded-xl bg-slate-50 px-6 py-6 flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-500">
            退職金の手取り額が分かったら、資産シミュレーターの「退職イベント」欄に転記すれば、
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
      <RelatedArticles
        articles={[
          { title: '55歳で早期退職したら資産はどうなる?年金までの空白期間をシミュレーション', href: '/blog/semi-retirement-blank-period' },
          { title: 'FIRE計画で失敗しないための7つのチェックリスト|シミュレーション前に確認したいポイント', href: '/blog/fire-checklist' },
        ]}
      />
    </div>
  );
}
