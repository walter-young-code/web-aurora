'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { GalleryImage } from '@/types/work';
import { DominantColorImage } from './DominantColorImage';
import { Lightbox, type LightboxImage } from './Lightbox';

/** 归一化后的单张画廊图：alt 已按当前语言解析完毕 */
type GalleryEntry = LightboxImage & {
  dominantColor?: string;
};

/**
 * 详情页画廊。图片本身走 next/image + 主色占位，点开进 Lightbox。
 * 首屏 1–2 张 priority，其余懒加载。
 *
 * images 允许字符串：next-mdx-remote v6 默认 blockJS，MDX 里的 `={["a"]}` 表达式会被丢掉，
 * 所以内容侧只能写 <ImageGallery images="a.jpg,b.jpg" />；
 * 结构化相册（Work.gallery）传 GalleryImage[]，此处按语言解析 alt、透传主色。
 */
export function ImageGallery({
  images,
  title,
}: {
  images: string | string[] | GalleryImage[];
  title?: string;
}) {
  const t = useTranslations('media');
  const locale = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const heading = title ?? t('gallery');
  const list = useMemo<GalleryEntry[]>(() => {
    const raw = Array.isArray(images) ? images : String(images ?? '').split(',');
    const lang = locale === 'en' ? 'en' : 'zh';
    return raw
      .map((item) =>
        typeof item === 'string'
          ? { src: item.trim() }
          : { src: item.src?.trim() ?? '', alt: item.alt?.[lang], dominantColor: item.dominantColor },
      )
      .filter((item) => item.src.length > 0);
  }, [images, locale]);

  if (list.length === 0) return null;

  return (
    <>
      <div className="my-lg grid gap-sm sm:grid-cols-2">
        {list.map((item, index) => {
          const alt = item.alt ?? t('imageAlt', { title: heading, index: index + 1 });
          return (
            <button
              key={item.src}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group cursor-zoom-in text-left"
              aria-label={alt}
            >
              <DominantColorImage
                src={item.src}
                alt={alt}
                dominantColor={item.dominantColor}
                sizes="(max-width: 767px) 92vw, 45vw"
                priority={index < 2}
                className={cn(
                  'w-full',
                  index % 3 === 2 ? 'aspect-cover-portrait' : 'aspect-cover-landscape',
                )}
                imgClassName="transition-transform duration-hover ease-out-soft group-hover:scale-[1.03]"
              />
            </button>
          );
        })}
      </div>

      {openIndex !== null ? (
        <Lightbox
          images={list}
          index={openIndex}
          altPrefix={heading}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}
