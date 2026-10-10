'use client';

import { usePathname, useRouter } from '@/i18n/routing';
import type { TagOption } from '@/lib/content';
import type { Locale } from '@/types/localized';
import { cn } from '@/lib/utils';
import type { WorkType } from '@/types/work';

export type WorkFilterState = {
  type?: WorkType;
  tag?: string;
};

type FilterLabels = {
  all: string;
  photography: string;
  video: string;
  tags: string;
  tagAll: string;
};

/**
 * 筛选状态同步进 URL（可分享、刷新后还在），但过滤本身在客户端完成：
 * 这样 /works 保持一份静态 HTML，不会因为 query 退回动态渲染。
 */
export function WorksFilter({
  locale,
  labels,
  tagOptions,
  value,
  onChange,
}: {
  locale: Locale;
  labels: FilterLabels;
  tagOptions: TagOption[];
  value: WorkFilterState;
  onChange: (next: WorkFilterState) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const apply = (next: WorkFilterState) => {
    onChange(next);
    const query: Record<string, string> = {};
    if (next.type) query.type = next.type;
    if (next.tag) query.tag = next.tag;
    router.replace({ pathname, query }, { scroll: false });
  };

  const typeOptions: { value?: WorkType; label: string }[] = [
    { value: undefined, label: labels.all },
    { value: 'photography', label: labels.photography },
    { value: 'video', label: labels.video },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div role="group" aria-label={labels.tags} className="flex flex-wrap items-center gap-md">
        {typeOptions.map((option) => {
          const active = value.type === option.value;
          return (
            <button
              key={option.value ?? 'all'}
              type="button"
              aria-current={active ? 'true' : undefined}
              onClick={() => apply({ type: option.value, tag: value.tag })}
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

      <div className="flex flex-wrap items-center gap-xs">
        <span className="text-meta-caption text-text-muted">{labels.tags}</span>
        <button
          type="button"
          aria-pressed={!value.tag}
          onClick={() => apply({ type: value.type, tag: undefined })}
          className={cn(
            'rounded-chip px-xs py-xxs text-meta-caption transition-colors duration-micro',
            value.tag
              ? 'text-text-muted hover:text-text-secondary'
              : 'bg-bg-elevated text-text-primary',
          )}
        >
          {labels.tagAll}
        </button>
        {tagOptions.map((tag) => {
          const active = value.tag === tag.key;
          return (
            <button
              key={tag.key}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ type: value.type, tag: active ? undefined : tag.key })}
              className={cn(
                'rounded-chip px-xs py-xxs text-meta-caption transition-colors duration-micro',
                active
                  ? 'bg-bg-elevated text-accent'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {tag.label[locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
