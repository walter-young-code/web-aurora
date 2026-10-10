import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getProfile, getSettings } from '@/lib/content';
import type { Locale } from '@/types/localized';

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const tn = await getTranslations({ locale, namespace: 'nav' });
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const name = profile.name[locale];
  // 社交链接：站点设置优先，为空则回落个人资料
  const socials = settings.socials.length > 0 ? settings.socials : profile.socials;
  const footerNote = settings.footerNote[locale];

  const links = [
    { href: '/' as const, label: tn('home') },
    { href: '/works' as const, label: tn('works') },
    { href: '/recommendations' as const, label: tn('recommendations') },
  ];

  return (
    <footer className="border-t border-line">
      <div className="page-container flex flex-col gap-xl py-xxl md:flex-row md:justify-between">
        <div className="flex flex-col gap-xs">
          <span className="font-display text-heading-card text-text-primary">
            {name}
          </span>
          <span className="text-meta-caption text-text-secondary">{profile.title[locale]}</span>
        </div>

        <nav aria-label={t('navigation')} className="flex flex-col gap-xs">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="w-fit text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-xs">
          <span className="text-meta-caption text-text-muted">{t('follow')}</span>
          {socials.map((social) => (
            <a
              key={social.platform}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
            >
              {social.platform} ↗
            </a>
          ))}
          {settings.contactEmail ? (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="w-fit text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
            >
              {settings.contactEmail}
            </a>
          ) : null}
        </div>
      </div>

      {footerNote ? (
        <div className="page-container pb-xs text-meta-caption text-text-secondary">
          {footerNote}
        </div>
      ) : null}

      <div className="page-container pb-lg text-meta-caption text-text-muted">
        © {new Date().getFullYear()} {name}. {t('rights')}
      </div>
    </footer>
  );
}
