'use client';

import { useLocale, useTranslations } from 'next-intl';
import { routing, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { Locale } from '@/types/localized';

const LABELS: Record<Locale, string> = { zh: '中', en: 'EN' };

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn('flex items-center gap-xxs', className)}
    >
      {routing.locales.map((option) => {
        const isActive = option === locale;
        return (
          <button
            key={option}
            type="button"
            aria-current={isActive ? 'true' : undefined}
            onClick={() => {
              // 保留当前查询参数（如 /works?tag=...），切换语言不丢筛选；
              // 运行时读 location.search，避免 useSearchParams 给静态页强加 Suspense 边界
              const search = window.location.search;
              router.replace(search ? `${pathname}${search}` : pathname, { locale: option });
            }}
            className={cn(
              'rounded-chip px-xs py-xxs text-nav-link transition-colors duration-micro',
              isActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
