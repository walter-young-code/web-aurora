'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/types/localized';
import type { Recommendation, RecommendationType } from '@/types/recommendation';
import { cn } from '@/lib/utils';
import { RecommendationsGrid } from './RecommendationsGrid';

export function RecExplorer({
  items,
  locale,
}: {
  items: Recommendation[];
  locale: Locale;
}) {
  const t = useTranslations('recommendations');
  const [type, setType] = useState<RecommendationType | undefined>(undefined);

  const options: { value?: RecommendationType; label: string }[] = [
    { value: undefined, label: t('filterAll') },
    { value: 'open-source', label: t('filterOpenSource') },
    { value: 'software', label: t('filterSoftware') },
  ];

  const visible = type ? items.filter((item) => item.type === type) : items;

  return (
    <div className="flex flex-col gap-xl">
      <div role="group" aria-label={t('title')} className="flex flex-wrap items-center gap-md">
        {options.map((option) => {
          const active = type === option.value;
          return (
            <button
              key={option.value ?? 'all'}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => setType(option.value)}
              className={cn(
                'border-b-2 pb-xxs text-nav-link transition-colors duration-micro',
                active
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <RecommendationsGrid items={visible} locale={locale} />
      ) : (
        <p className="border border-line bg-bg-elevated p-xl text-body-md text-text-muted">
          {t('empty')}
        </p>
      )}
    </div>
  );
}
