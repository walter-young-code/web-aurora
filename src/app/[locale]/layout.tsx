import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Space_Grotesk } from 'next/font/google';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { routing } from '@/i18n/routing';
import { getProfile, getSettings } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
import { isLocale } from '@/lib/utils';

/**
 * 只自托管拉丁展示字体，中文一律回落系统字体（整套中文字体会拖垮 LCP）。
 * next/font 已把字体作为静态资源打包，运行时不发外部请求。
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const dynamicParams = true;

/**
 * 首屏防闪烁：在 body 解析到内容之前把 data-theme 落到 <html>。
 * 优先用户显式选择（localStorage），否则跟随系统 prefers-color-scheme。
 * 默认（无存储 + 非浅色）不落属性 → :root 暗色阶接管。
 */
const THEME_INIT = `
(function(){try{var k='aurora-theme';var s=localStorage.getItem(k);
var light=s==='light'||(!s&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches);
if(light)document.documentElement.setAttribute('data-theme','light');}catch(e){}})();
`;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // meta 标签无法引用 CSS 变量，这里的值与 --color-bg 保持一致
  themeColor: '#0a0a0b',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const active = isLocale(locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({
    locale: active,
    namespace: 'meta.site',
  });
  const settings = await getSettings();

  return pageMetadata({
    locale,
    path: '',
    title: settings.defaultSeoTitle || t('title'),
    description: settings.defaultDescription || t('description'),
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // 全站 SSG：没有这一句，next-intl 会在构建期把页面退回动态渲染
  setRequestLocale(locale);

  const profile = await getProfile();
  const tn = await getTranslations({ locale, namespace: 'nav' });

  return (
    <html lang={locale} className={spaceGrotesk.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-bg font-sans text-text-primary antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-sm focus:top-sm focus:z-50 focus:rounded-chip focus:bg-bg-elevated focus:px-sm focus:py-xs focus:text-nav-link focus:text-text-primary"
          >
            {tn('skipToContent')}
          </a>
          <Header name={profile.name[locale]} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer locale={locale} />
          <div className="grain" aria-hidden="true" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
