import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { CONCERNS, STAGE_LABELS, STAGE_ORDER } from '@/data/concerns';
import { CONCERN_CTA_LABELS } from '@/lib/concernCtaLabels';
import ConcernCard from '@/components/concerns/ConcernCard';
import Container from '@/components/layout/Container';
import PageHeader from '@/components/layout/PageHeader';
import JumpChips from '@/components/layout/JumpChips';
import ListSectionHeading from '@/components/layout/ListSectionHeading';

export const metadata: Metadata = {
  title: 'お悩み一覧 | FREENOUGH 資産シミュレーター',
  description: 'よくある悩みと、シミュレーターで分かることをまとめました。',
  alternates: {
    canonical: `${SITE_URL}/concerns`,
  },
};

export default function ConcernsPage() {
  return (
    <Container className="py-12">
      <PageHeader
        title="お悩み一覧"
        description="よくある悩みと、シミュレーターで分かることをまとめました"
        breadcrumbs={[
          { name: '資産シミュレーター', href: '/' },
          { name: 'お悩み一覧', href: '/concerns' },
        ]}
      />

      <div className="mt-6">
        <JumpChips items={STAGE_ORDER.map((stage) => ({ id: stage, label: STAGE_LABELS[stage] }))} />
      </div>

      {STAGE_ORDER.map((stage) => (
        <div key={stage} className="mt-10">
          <ListSectionHeading id={stage}>{STAGE_LABELS[stage]}</ListSectionHeading>
          <div className="grid gap-5 sm:grid-cols-2">
            {CONCERNS.filter((c) => c.stage === stage).map((concern) => (
              <ConcernCard
                key={concern.id}
                concern={{ ...concern, ctaLabel: CONCERN_CTA_LABELS[concern.ctaType] }}
                location="concerns_list"
              />
            ))}
          </div>
        </div>
      ))}
    </Container>
  );
}
