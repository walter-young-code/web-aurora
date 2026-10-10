import { Link } from '@/i18n/routing';
import type { Profile } from '@/lib/content';
import type { Locale } from '@/types/localized';
import { ScrollReveal } from '../effects/ScrollReveal';
import { SectionHeading } from './SectionHeading';
import { DominantColorImage } from '../media/DominantColorImage';

/** 个人介绍：左图右文的非对称布局，桌面 1 : 2，移动单列 */
export function AboutSection({
  profile,
  locale,
  heading,
  ctaLabel,
}: {
  profile: Profile;
  locale: Locale;
  heading: string;
  ctaLabel: string;
}) {
  return (
    <section className="page-container py-xxl">
      <SectionHeading title={heading} />
      <ScrollReveal className="grid items-center gap-xl md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div data-reveal>
          <DominantColorImage
            src={profile.avatar}
            alt={profile.name[locale]}
            sizes="(max-width: 767px) 92vw, 30vw"
            className="aspect-cover-portrait w-full"
          />
        </div>
        <div data-reveal className="flex flex-col gap-md">
          <p className="text-meta-caption text-text-secondary">{profile.title[locale]}</p>
          <p className="max-w-prose text-body-prose text-text-secondary">{profile.bio[locale]}</p>
          <div className="flex flex-wrap items-center gap-md">
            {profile.socials.map((social) => (
              <a
                key={social.platform}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
              >
                {social.platform} ↗
              </a>
            ))}
            <Link
              href="/works"
              className="text-nav-link text-accent transition-opacity duration-micro hover:opacity-80"
            >
              {ctaLabel} →
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
