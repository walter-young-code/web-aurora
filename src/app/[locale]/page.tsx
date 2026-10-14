import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import { getHomeWorks, getProfile, getRecommendations, getSettings } from '@/lib/content';
import { HeroSection } from '@/components/sections/HeroSection';
import { SectionHeading } from '@/components/sections/SectionHeading';
import { WorksGallery } from '@/components/sections/WorksGallery';
import { AboutSection } from '@/components/sections/AboutSection';
import { RecommendationsGrid } from '@/components/sections/RecommendationsGrid';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'home' });
  const profile = await getProfile();
  const settings = await getSettings();
  const works = await getHomeWorks(6);
  const recommendations = (await getRecommendations()).slice(0, 4);
  // 新部署未 seed 或作品被清空时，works 可能为空数组；此处必须做可选链守卫，
  // 否则 heroWork.cover / heroWork.dominantColor 会抛 TypeError 导致首页 500。
  const heroWork = works.find((work) => work.featured) ?? works[0];
  // Hero 背景优先级：站点设置自定义背景 > 精选/首个作品封面 > 空（由 HeroSection 降级为纯色背景）
  const heroCover = settings.heroImage ?? heroWork?.cover ?? '';
  const heroCoverColor = settings.heroImage
    ? (settings.heroColor ?? undefined)
    : heroWork?.dominantColor;

  const viewAllClass =
    'text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent';

  return (
    <>
      <HeroSection
        name={profile.name[locale]}
        title={profile.title[locale]}
        bio={profile.bio[locale]}
        cover={heroCover}
        coverColor={heroCoverColor}
      />

      <section className="page-container py-xxl">
        <SectionHeading
          title={t('featured')}
          action={
            <Link href="/works" className={viewAllClass}>
              {t('allWorks')}
            </Link>
          }
        />
        <WorksGallery works={works} locale={locale} priorityCount={1} />
      </section>

      <AboutSection
        profile={profile}
        locale={locale}
        heading={t('about')}
        ctaLabel={t('aboutCta')}
      />

      <section className="page-container py-xxl">
        <SectionHeading
          title={t('recommended')}
          action={
            <Link href="/recommendations" className={viewAllClass}>
              {t('allRecommendations')}
            </Link>
          }
        />
        <RecommendationsGrid items={recommendations} locale={locale} />
      </section>
    </>
  );
}
