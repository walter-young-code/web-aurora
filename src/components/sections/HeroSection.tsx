'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { DominantColorImage } from '../media/DominantColorImage';
import { HeroScrollParallax } from '../effects/HeroScrollParallax';

type Props = {
  name: string;
  title: string;
  bio: string;
  cover: string;
  coverColor?: string;
};

export function HeroSection({ name, title, bio, cover, coverColor }: Props) {
  const t = useTranslations('hero');

  return (
    <section className="hero-full relative flex items-end overflow-hidden">
      {/* 签名动效层：外层跟随滚动位移缩放，内层是 20s 极缓 Ken Burns */}
      <HeroScrollParallax className="absolute inset-0">
        <div data-hero-visual className="absolute inset-0">
          <div className="hero-ken-burns absolute inset-[-6%]">
            {cover ? (
              <DominantColorImage
                src={cover}
                alt=""
                dominantColor={coverColor}
                priority
                sizes="100vw"
                className="h-full w-full"
                imgClassName="opacity-90"
              />
            ) : (
              // 降级：新部署未 seed / 未配置站点背景时，用主色或主题背景色铺底，避免空图报错
              <div
                className="h-full w-full bg-bg-elevated"
                style={coverColor ? { backgroundColor: coverColor } : undefined}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </HeroScrollParallax>

      {/* 顶部独立渐变：只保护导航区可读性，不重新压暗整张底图 */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-bg/60 to-bg/0" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/15 to-bg" />

      <div data-hero-copy className="hero-copy page-container relative z-10 pb-xxl pt-section">
        {/* 职业标题是承载内容的文本，不得降到 text-muted（对比度需满足 WCAG AA） */}
        <p className="text-meta-caption text-text-secondary">{title}</p>
        <h1 className="mt-xs font-display text-display-hero text-text-primary">{name}</h1>
        <p className="mt-md max-w-prose text-display-hero-sub text-text-secondary">{bio}</p>
        <Link
          href="/works"
          className="mt-lg inline-flex h-11 items-center rounded-chip bg-accent px-md text-nav-link text-on-primary transition-[opacity,translate] duration-micro ease-out-soft hover:-translate-y-xxs hover:opacity-90"
        >
          {t('viewWorks')}
        </Link>
        <p className="mt-xxl text-meta-caption text-text-muted">
          <span className="hero-scroll-hint inline-block">{t('scroll')} ↓</span>
        </p>
      </div>
    </section>
  );
}
