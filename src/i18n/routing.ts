import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  // 全站 URL 一律带 locale 前缀（/zh/works/a、/en/works/a），不做 as-needed 省略
  localePrefix: 'always',
});

/**
 * 语言切换与站内链接统一用这一套：只替换 locale 段，pathname/slug 原样保留，
 * 因此从 /zh/works/x 切到英文一定落在 /en/works/x，不会跳回首页。
 */
export const { Link, usePathname, useRouter } = createNavigation(routing);

export type Locale = (typeof routing.locales)[number];
