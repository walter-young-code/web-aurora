import type { Locale } from '@/types/localized';
import type { Recommendation } from '@/types/recommendation';
import { ScrollReveal } from '../effects/ScrollReveal';
import { RecommendationCard } from '../media/RecommendationCard';

export function RecommendationsGrid({
  items,
  locale,
}: {
  items: Recommendation[];
  locale: Locale;
}) {
  return (
    <ScrollReveal
      stagger={0.08}
      className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((item) => (
        <div key={item.slug} data-reveal>
          <RecommendationCard item={item} locale={locale} />
        </div>
      ))}
    </ScrollReveal>
  );
}
