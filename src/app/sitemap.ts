import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getWorks } from '@/lib/content';
import { siteUrl } from '@/lib/utils';

// 与前台一致：sitemap 也在请求期读库生成，避免把构建期种子内容烘焙进镜像、重启后 URL 列表回退
export const dynamic = 'force-dynamic';

/** 双语全部 URL，每条都带成对 hreflang */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ['/', '/works', '/recommendations'];
  const entries: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    entries.push(...build(path, path === '/' ? 1 : 0.8));
  }
  for (const work of await getWorks()) {
    entries.push(...build(`/works/${work.slug}`, 0.7, work.createdAt));
  }

  return entries;
}

function build(
  path: string,
  priority: number,
  lastModified?: string,
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${siteUrl}/${locale}${path === '/' ? '' : path}`;
  }
  // 与 seo.ts 的 hreflang 对齐：x-default 落默认语言版
  languages['x-default'] =
    `${siteUrl}/${routing.defaultLocale}${path === '/' ? '' : path}`;

  return routing.locales.map((locale) => ({
    url: `${siteUrl}/${locale}${path === '/' ? '' : path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency: 'monthly',
    priority,
    alternates: { languages },
  }));
}
