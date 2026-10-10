import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getTagOptions, getWorks } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { WorksExplorer } from '@/components/sections/WorksExplorer';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: active, namespace: 'works' });
  const site = await getTranslations({ locale: active, namespace: 'meta.site' });
  return pageMetadata({
    locale: active,
    path: '/works',
    title: `${t('title')} — ${site('title')}`,
    description: t('lead'),
  });
}

export default async function WorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'works' });
  const works = await getWorks();
  const tagOptions = await getTagOptions();

  return (
    <div className="page-container pb-xxl pt-xl lg:pt-xxl">
      <header className="mb-xl flex flex-col gap-xs">
        <h1 className="font-display text-heading-section text-text-primary">{t('title')}</h1>
        <p className="max-w-prose text-body-md text-text-secondary">{t('lead')}</p>
      </header>
      <WorksExplorer works={works} tagOptions={tagOptions} locale={locale} />
    </div>
  );
}
