import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { absoluteUrl, isLocale, siteUrl } from '@/lib/utils';
import type { Locale } from '@/types/localized';

/**
 * layout 的 metadata 会被子路由继承，包括 alternates。
 * 所以每个路由必须自己发一遍 canonical + hreflang，否则 /en/works 会带上首页的 canonical。
 */
export function pageMetadata(options: {
  locale: string;
  path: string;
  title: string;
  description: string;
  type?: 'website' | 'article';
  images?: { url: string; width: number; height: number }[];
}): Metadata {
  const active: Locale = isLocale(options.locale)
    ? options.locale
    : routing.defaultLocale;
  const hasImage = !!options.images?.length;
  const languages: Record<string, string> = {};
  // hreflang 用绝对地址：爬虫对相对地址的解析并不一致
  for (const locale of routing.locales)
    languages[locale] = `${siteUrl}/${locale}${options.path}`;
  // x-default：浏览器语言不匹配任何 locale 时的确定落点，指向默认语言版
  languages['x-default'] =
    `${siteUrl}/${routing.defaultLocale}${options.path}`;

  return {
    // 让 Next 把任何相对 URL（OG/图标等）解析为绝对地址
    metadataBase: new URL(siteUrl),
    title: options.title,
    description: options.description,
    alternates: {
      canonical: `${siteUrl}/${active}${options.path}`,
      languages,
    },
    openGraph: {
      siteName: 'Aurora',
      locale: active === 'zh' ? 'zh_CN' : 'en_US',
      url: `${siteUrl}/${active}${options.path}`,
      title: options.title,
      description: options.description,
      type: options.type ?? 'website',
      images: options.images,
    },
    // Twitter 卡片沿用 OG 图，缺图时退化为 summary
    twitter: {
      card: hasImage ? 'summary_large_image' : 'summary',
      title: options.title,
      description: options.description,
      images: options.images?.map((image) => image.url),
    },
  };
}

export function ogImage(cover: string, width = 1200, height = 800) {
  return [{ url: absoluteUrl(cover, siteUrl), width, height }];
}
