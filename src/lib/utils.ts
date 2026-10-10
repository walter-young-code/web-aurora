import type { Locale } from '@/types/localized';
import { routing } from '@/i18n/routing';
import type { CoverRatio } from '@/types/work';
import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * 自定义 token 需显式登记：tailwind-merge 默认不认得 globals.css 的 `--text-*` 字号，
 * 会把 `text-heading-section` 误判成文字颜色，与 `text-text-primary` 归入同一冲突组 →
 * 合并时保留字号、吞掉颜色（此前靠 body 继承 text-primary 侥幸没露馅）。
 * 把九个字号 token 归进 font-size 组后，`text-<字号>` 与 `text-<颜色>` 各回各组，不再互斥。
 */
const twMerge = extendTailwindMerge({
  extend: {
    // 字号类挂在 `text` 前缀下（不是直接往 'font-size' 追加字符串），否则不生效。
    classGroups: {
      'font-size': [
        {
          text: [
            'display-hero',
            'display-hero-sub',
            'heading-section',
            'heading-card',
            'body-md',
            'body-prose',
            'nav-link',
            'meta-caption',
            'meta-caption-en',
          ],
        },
      ],
    },
  },
});

/**
 * clsx + tailwind-merge（Shadcn 的 cn 约定）：既拼接条件类，又合并冲突的 Tailwind 类。
 * 前台原有调用（变参字符串）是其超集，行为兼容。
 */
export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

export function isLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}

/** zh → 2024年6月1日，en → Jun 1, 2024 */
export function formatDate(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
  }).format(new Date(`${iso}T00:00:00`));
}

/** 封面只允许两档比例，映射到 globals.css 的 aspect token */
export function coverAspectClass(ratio: CoverRatio): string {
  return ratio === 1.5 ? 'aspect-cover-landscape' : 'aspect-cover-portrait';
}

/** 结构化数据与 sitemap 都要用的绝对地址 */
export function absoluteUrl(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).toString();
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * 由英文标签生成语言无关的筛选键（如 "Landscape" → "landscape"，"Short Film" → "short-film"）。
 * tagKeys 依赖它保证中英切换后筛选不丢。
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
