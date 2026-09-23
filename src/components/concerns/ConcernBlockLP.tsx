import { CONCERNS } from '@/data/concerns';
import { CONCERN_CTA_LABELS } from '@/lib/concernCtaLabels';
import ConcernCard from './ConcernCard';
import SectionHeading from '@/components/layout/SectionHeading';
import Container from '@/components/layout/Container';

export default function ConcernBlockLP() {
  const featuredConcerns = CONCERNS.filter((c) => c.featured);

  return (
    <section className="bg-slate-50 py-12">
      <Container>
        <SectionHeading
          label="お悩み"
          heading="こんな悩みはありませんか?"
          body="シミュレーターなら、悩みに具体的な数字で答えられます"
          linkHref="/concerns"
          linkLabel="お悩み一覧を見る→"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          {featuredConcerns.map((concern) => (
            <ConcernCard
              key={concern.id}
              concern={{ ...concern, ctaLabel: CONCERN_CTA_LABELS[concern.ctaType] }}
              location="lp"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
