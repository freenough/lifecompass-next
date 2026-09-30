import { CONCERNS } from '@/data/concerns';
import { CONCERN_CTA_LABELS } from '@/lib/concernCtaLabels';
import ConcernCard from './ConcernCard';
import SectionHeading from '@/components/layout/SectionHeading';
import Container from '@/components/layout/Container';
import Reveal from '@/components/motion/Reveal';

export default function ConcernBlockLP() {
  const featuredConcerns = CONCERNS.filter((c) => c.featured);

  return (
    <section className="bg-slate-50 py-12">
      <Container>
        <Reveal>
          <SectionHeading
            label="お悩み"
            heading="こんな悩みはありませんか?"
            body="シミュレーターなら、悩みに具体的な数字で答えられます"
            linkHref="/concerns"
            linkLabel="お悩み一覧を見る→"
          />
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* ConcernCard本体は/concernsと共有のため変更せず、外側のRevealで包む。
              Revealがグリッドの子になるため、*:h-fullでカードを元どおり行の高さに揃える
              （implementation_lp_scroll_reveal.md 4-1節）。 */}
          {featuredConcerns.map((concern) => (
            <Reveal key={concern.id} className="*:h-full">
              <ConcernCard
                concern={{ ...concern, ctaLabel: CONCERN_CTA_LABELS[concern.ctaType] }}
                location="lp"
              />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
