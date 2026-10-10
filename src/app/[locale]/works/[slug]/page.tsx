import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import { getAdjacentWorks, getWork, getWorks, readWorkDoc } from '@/lib/content';
import { ogImage, pageMetadata } from '@/lib/seo';
import { absoluteUrl, cn, coverAspectClass, formatDate, isLocale, siteUrl } from '@/lib/utils';
import type { Locale } from '@/types/localized';
import type { Work } from '@/types/work';
import { DominantColorImage } from '@/components/media/DominantColorImage';
import { ImageGallery } from '@/components/media/ImageGallery';
import { LazyVideoEmbed } from '@/components/media/LazyVideoEmbed';
import { MdxArticle } from '@/components/mdx/MdxArticle';
import { ScrollReveal } from '@/components/effects/ScrollReveal';

export async function generateStaticParams() {
  const works = await getWorks();
  return routing.locales.flatMap((locale) =>
    works.map((work) => ({ locale, slug: work.slug })),
  );
}

export const dynamicParams = true;

function isoDuration(clock?: string) {
  if (!clock) return undefined;
  const [minutes, seconds] = clock.split(':').map(Number);
  return `PT${minutes}M${seconds ?? 0}S`;
}

function buildJsonLd(work: Work, locale: Locale) {
  const base = {
    '@context': 'https://schema.org',
    name: work.title[locale],
    description: work.summary[locale],
  };
  if (work.type === 'video') {
    return {
      ...base,
      '@type': 'VideoObject',
      thumbnailUrl: absoluteUrl(work.cover, siteUrl),
      ...(work.video && work.video.kind === 'local'
        ? { contentUrl: absoluteUrl(work.video.src, siteUrl) }
        : {}),
      uploadDate: work.createdAt,
      duration: isoDuration(work.duration),
    };
  }
  return {
    ...base,
    '@type': 'ImageObject',
    contentUrl: absoluteUrl(work.cover, siteUrl),
    caption: work.title[locale],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const active = isLocale(locale) ? locale : 'zh';
  const work = await getWork(slug);
  if (!work) return {};

  const path = `/works/${slug}`;
  return pageMetadata({
    locale,
    path,
    title: work.title[active],
    description: work.summary[active],
    type: 'article',
    images: ogImage(work.cover),
  });
}

export default async function WorkDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const work = await getWork(slug);
  if (!work) notFound();

  const doc = await readWorkDoc(slug, locale);
  const { previous, next } = await getAdjacentWorks(slug);
  const t = await getTranslations({ locale, namespace: 'works' });

  const metaRows = [
    { label: t('meta.date'), value: formatDate(locale, work.createdAt) },
    {
      label: t('meta.type'),
      value: work.type === 'video' ? t('meta.typeVideo') : t('meta.typePhotography'),
    },
    { label: t('meta.tags'), value: work.tags[locale].join(' · ') },
  ];

  return (
    <div className="page-container pb-xxl pt-xl lg:pt-xxl">
      <Link
        href="/works"
        className="text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
      >
        ← {t('backToList')}
      </Link>

      <header className="mb-xl mt-md flex flex-col gap-xs">
        <h1 className="font-display text-heading-section text-text-primary">
          {work.title[locale]}
        </h1>
        <p className="max-w-prose text-body-md text-text-secondary">{work.summary[locale]}</p>
        {!doc.hasOwnTranslation && doc.body ? (
          <p className="border border-line bg-bg-elevated px-sm py-xs text-meta-caption text-text-muted">
            {t('missingTranslation')}
          </p>
        ) : null}
      </header>

      <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_240px]">
        <ScrollReveal className="lg:order-1">
          <div className={cn('w-full', coverAspectClass(work.coverRatio))}>
            <DominantColorImage
              src={work.cover}
              alt={work.title[locale]}
              dominantColor={work.dominantColor}
              priority
              sizes="(max-width: 1023px) 92vw, 70vw"
              className="h-full w-full"
            />
          </div>

          {doc.body ? (
            <MdxArticle source={doc.body} />
          ) : (
            <p className="my-lg max-w-prose text-body-prose text-text-secondary">
              {work.summary[locale]}
            </p>
          )}

          {work.video ? (
            <LazyVideoEmbed
              src={work.video.src}
              poster={work.video.poster}
              title={work.video.title?.[locale] || work.video.title?.en || work.title[locale]}
            />
          ) : null}

          {(work.gallery?.length ?? 0) > 0 ? (
            <ImageGallery images={work.gallery} title={work.title[locale]} />
          ) : null}

          <nav aria-label={t('previous')} className="mt-xxl grid gap-sm border-t border-line pt-lg sm:grid-cols-2">
            {previous ? (
              <Link
                href={`/works/${previous.slug}`}
                className="group flex flex-col gap-xxs text-body-md transition-colors duration-micro hover:text-accent"
              >
                <span className="text-meta-caption text-text-muted">← {t('previous')}</span>
                <span className="text-text-primary group-hover:text-accent">
                  {previous.title[locale]}
                </span>
              </Link>
            ) : null}
            {next ? (
              <Link
                href={`/works/${next.slug}`}
                className="group flex flex-col gap-xxs text-right text-body-md transition-colors duration-micro hover:text-accent sm:justify-self-end"
              >
                <span className="text-meta-caption text-text-muted">{t('next')} →</span>
                <span className="text-text-primary group-hover:text-accent">
                  {next.title[locale]}
                </span>
              </Link>
            ) : null}
          </nav>
        </ScrollReveal>

        <aside className="lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <dl className="flex flex-col gap-xs border border-line bg-bg-elevated p-sm">
            {metaRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-xxs">
                <dt className="text-meta-caption text-text-muted">{row.label}</dt>
                <dd className="text-meta-caption text-text-secondary">{row.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(work, locale)) }}
      />
    </div>
  );
}
