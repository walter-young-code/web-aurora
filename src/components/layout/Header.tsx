'use client';

import { useEffect, useState } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

/** 滚动超过这个距离才毛玻璃化 */
const SCROLL_THRESHOLD = 64;

export function Header({ name }: { name: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);
  /**
   * 记住菜单是在哪个地址打开的：地址一变，menuOpen 自然为 false，
   * 不需要 effect 去"收尾"。next-intl 的 usePathname 不含 locale 段，所以拼上 locale，
   * 移动端菜单里切换语言也会关掉浮层。
   */
  const routeKey = `${locale}${pathname}`;
  const [menu, setMenu] = useState<{ open: boolean; at: string }>({
    open: false,
    at: '',
  });
  const menuOpen = menu.open && menu.at === routeKey;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu({ open: false, at: routeKey });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, routeKey]);

  const links = [
    { href: '/works' as const, label: t('works') },
    { href: '/recommendations' as const, label: t('recommendations') },
  ];

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color] duration-micro',
        scrolled || menuOpen
          ? 'border-b border-line bg-bg/70 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="page-container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-display text-nav-link text-text-primary transition-colors duration-micro hover:text-accent"
        >
          {name}
        </Link>

        <nav aria-label={t('sections')} className="hidden items-center gap-lg md:flex">
          {links.map((link) => {
            const isCurrent = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative text-nav-link text-text-secondary transition-colors duration-micro hover:text-text-primary',
                  isCurrent ? 'text-text-primary' : 'nav-underline',
                )}
              >
                {link.label}
                {/* 当前页指示：文字下方居中的琥珀圆点 */}
                {isCurrent ? (
                  <span className="absolute -bottom-[6px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                ) : null}
              </Link>
            );
          })}
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>

        <button
          type="button"
          className="flex h-11 items-center gap-xs text-nav-link text-text-primary md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenu({ open: !menuOpen, at: routeKey })}
        >
          {menuOpen ? t('closeMenu') : t('openMenu')}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-16 z-30 flex flex-col justify-between bg-bg/95 px-sm pb-xxl pt-xl backdrop-blur-md md:hidden"
        >
          <nav
            aria-label={t('sections')}
            className="menu-enter flex flex-col items-center gap-lg"
          >
            <Link href="/" className="text-heading-section text-text-primary">
              {t('home')}
            </Link>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-heading-section text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="menu-enter flex items-center justify-center gap-sm">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      ) : null}
    </header>
  );
}
