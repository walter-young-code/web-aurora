'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TagOption } from '@/lib/content';
import type { Locale } from '@/types/localized';
import type { Work } from '@/types/work';
import { WorksFilter, type WorkFilterState } from './WorksFilter';
import { WorksGallery } from './WorksGallery';

function parseInitialFilter(): WorkFilterState {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  return {
    type: type === 'photography' || type === 'video' ? type : undefined,
    tag: params.get('tag') ?? undefined,
  };
}

export function WorksExplorer({
  works,
  tagOptions,
  locale,
}: {
  works: Work[];
  tagOptions: TagOption[];
  locale: Locale;
}) {
  const t = useTranslations('works');
  const [filter, setFilter] = useState<WorkFilterState>({});

  // 首屏渲染不带筛选（保持静态 HTML），水合后再从 URL 恢复筛选态。
  // URL 在这里是外部系统（深链/刷新后仍在），全站 SSG 让服务端拿不到 query，只能在挂载后读一次。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFilter(parseInitialFilter()), []);

  const visible = works.filter((work) => {
    if (filter.type && work.type !== filter.type) return false;
    if (filter.tag && !work.tagKeys.includes(filter.tag)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-xl">
      <WorksFilter
        locale={locale}
        tagOptions={tagOptions}
        value={filter}
        onChange={setFilter}
        labels={{
          all: t('filterAll'),
          photography: t('filterPhotography'),
          video: t('filterVideo'),
          tags: t('filterTags'),
          tagAll: t('filterTagAll'),
        }}
      />

      <p className="text-meta-caption text-text-muted">{t('results', { count: visible.length })}</p>

      {visible.length > 0 ? (
        <WorksGallery works={visible} locale={locale} />
      ) : (
        <p className="border border-line bg-bg-elevated p-xl text-body-md text-text-muted">
          {t('empty')}
        </p>
      )}
    </div>
  );
}
