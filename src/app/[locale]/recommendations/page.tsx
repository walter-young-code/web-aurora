import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getRecommendations } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { RecExplorer } from '@/components/sections/RecExplorer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: active, namespace: 'recommendations' });
  const site = await getTranslations({ locale: active, namespace: 'meta.site' });
  return pageMetadata({
    locale: active,
    path: '/recommendations',
    title: `${t('title')} — ${site('title')}`,
    description: t('lead'),
  });
}

export default async function RecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'recommendations' });
  const items = await getRecommendations();

  return (
    <div className="page-container pb-xxl pt-xl lg:pt-xxl">
      <header className="mb-xl flex flex-col gap-xs">
        <h1 className="font-display text-heading-section text-text-primary">{t('title')}</h1>
        <p className="max-w-prose text-body-md text-text-secondary">{t('lead')}</p>
      </header>
      <RecExplorer items={items} locale={locale} />
    </div>
  );
}
