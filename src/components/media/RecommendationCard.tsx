import type { Locale } from '@/types/localized';
import type { Recommendation } from '@/types/recommendation';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { DominantColorImage } from './DominantColorImage';

/**
 * 推荐封面：有真实图就用图（站内图走主色占位，外链图直渲 <img>）；
 * 无图时回落为色块 + 字母标识（cover-mark）。
 * 琥珀不参与色块，避免和作品卡争色。
 */
function RecommendationCover({ item }: { item: Recommendation }) {
  if (item.cover?.startsWith('/')) {
    return (
      <DominantColorImage
        src={item.cover}
        alt={item.title}
        dominantColor={item.dominantColor}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        className="aspect-cover-landscape"
      />
    );
  }
  if (item.cover) {
    return (
      <div className="relative aspect-cover-landscape overflow-hidden rounded-card bg-bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
      </div>
    );
  }
  return <CoverMark mark={item.mark} />;
}

/**
 * 推荐条目没有真实截图时，封面位用色块 + 字母标识（cover-mark）。
 * 琥珀不参与，避免和作品卡争色。
 */
export function CoverMark({
  mark,
  className,
}: {
  mark: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid aspect-cover-landscape place-items-center rounded-card bg-bg-elevated transition-colors duration-micro',
        className,
      )}
    >
      <span className="font-display text-heading-section text-text-secondary transition-colors duration-micro group-hover:text-text-primary">
        {mark}
      </span>
    </div>
  );
}

export function RecommendationCard({
  item,
  locale,
}: {
  item: Recommendation;
  locale: Locale;
}) {
  const t = useTranslations('recommendations');

  return (
    <article className="group flex flex-col gap-xs">
      <RecommendationCover item={item} />
      <div className="flex flex-col gap-xxs">
        <h3 className="font-display text-heading-card text-text-primary">{item.title}</h3>
        <p className="text-body-md text-text-secondary">{item.summary[locale]}</p>
        <p className="text-meta-caption text-text-muted">
          {item.tags.slice(0, 3).join(' · ')}
        </p>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-xs w-fit text-nav-link text-text-secondary underline underline-offset-4 transition-colors duration-micro hover:text-accent"
      >
        {t('visit')} ↗
        <span className="sr-only">
          {' '}
          {t('visitAria', { title: item.title })}
        </span>
      </a>
    </article>
  );
}
