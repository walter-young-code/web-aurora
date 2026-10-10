import type { Locale } from '@/types/localized';
import type { Work } from '@/types/work';
import { ScrollReveal } from '../effects/ScrollReveal';
import { WorkCard } from '../media/WorkCard';

/**
 * Bento 不等高网格：featured 占 2×2，其余按封面比例决定行高。
 * grid-flow-dense 让被跨格打断的位置重新填满，避免出现空洞。
 */
export function WorksGallery({
  works,
  locale,
  priorityCount = 0,
}: {
  works: Work[];
  locale: Locale;
  priorityCount?: number;
}) {
  return (
    <ScrollReveal
      stagger={0.08}
      className="grid grid-flow-dense grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {works.map((work, index) => (
        <WorkCard
          key={work.slug}
          work={work}
          locale={locale}
          isFeatured={work.featured}
          priority={index < priorityCount}
        />
      ))}
    </ScrollReveal>
  );
}
