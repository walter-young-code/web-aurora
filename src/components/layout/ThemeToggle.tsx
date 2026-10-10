'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * 浅色/深色开关。只读写 <html> 的 data-theme 与 localStorage，不持有 React state：
 * 当前态由根属性驱动（图标显隐见 globals.css 的 .theme-toggle），因此 SSR 与客户端渲染完全一致。
 * 切换即写入显式选择，之后不再跟随系统（除非清站数据）。
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('nav');

  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    try {
      localStorage.setItem('aurora-theme', next);
    } catch {
      /* 隐私模式 / 存储不可用：本次会话内切换仍生效 */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('themeToggle')}
      className={cn(
        'theme-toggle inline-flex items-center rounded-chip px-xs py-xxs text-nav-link',
        'text-text-muted transition-colors duration-micro hover:text-text-secondary',
        className,
      )}
    >
      <svg
        className="i-sun"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg
        className="i-moon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
