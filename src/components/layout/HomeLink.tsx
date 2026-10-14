'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * 404 页专用的「回到首页」链接。
 *
 * 背景：src/app/[locale]/not-found.tsx 在 dynamicParams=false 时会被 Next 16 提到
 * [locale] 布局之外预渲染，那里拿不到 route params，因此无法用 @/i18n/routing 的 Link
 * （它依赖 locale 上下文）。若直接写 href="/"，中间件会 302 到默认 locale，
 * 从 /en/foo 触发 404 的用户点回首页会被跳到 /zh，与预期不符。
 *
 * 这里在客户端从 pathname 首段解析当前 locale（拿不到就回落默认），
 * 生成显式带前缀的 /zh 或 /en 链接，避免多余重定向也保留语言上下文。
 */
export function HomeLink({ className }: { className?: string }) {
  const pathname = usePathname();
  const firstSegment = pathname?.split('/')[1] ?? '';
  const locales: readonly string[] = routing.locales;
  const locale = locales.includes(firstSegment) ? firstSegment : routing.defaultLocale;
  return (
    <Link href={`/${locale}`} className={className}>
      回到首页 / Back to home
    </Link>
  );
}
