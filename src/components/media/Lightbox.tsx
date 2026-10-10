'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

/** 画廊传给 Lightbox 的最小信息：src + 已按语言解析完的 alt（可缺省，逐张回落翻译） */
export type LightboxImage = {
  src: string;
  alt?: string;
};

type Props = {
  images: LightboxImage[];
  index: number;
  altPrefix: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

/**
 * 摄影站的核心体验：键盘可完全操作、焦点圈定在弹层内、
 * 只渲染当前张与相邻两张（相邻预取），移动端左右滑动切换。
 */
export function Lightbox({ images, index, altPrefix, onClose, onIndexChange }: Props) {
  const t = useTranslations('lightbox');
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  const total = images.length;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + total) % total),
    [index, onIndexChange, total],
  );

  useEffect(() => {
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      }
      if (event.key === 'Tab') trapFocus(event, dialogRef.current);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, onClose]);

  const neighbours = [
    (index - 1 + total) % total,
    (index + 1) % total,
  ];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={altPrefix}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-bg/95 backdrop-blur-md outline-none"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined) return;
        const delta = end - start;
        if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between px-sm py-xs">
        <span className="text-meta-caption text-text-secondary">
          {t('counter', { current: index + 1, total })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-chip px-xs py-xxs text-nav-link text-text-secondary transition-colors duration-micro hover:text-text-primary"
        >
          {t('close')}
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-sm pb-lg">
        <Image
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt ?? t('imageAlt', { index: index + 1, total })}
          width={1600}
          height={1100}
          sizes="100vw"
          className="max-h-full w-auto object-contain"
        />
        {neighbours.map((neighbour) => (
          <Image
            key={images[neighbour].src}
            src={images[neighbour].src}
            alt=""
            width={1600}
            height={1100}
            sizes="0px"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-md pb-sm">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded-chip px-sm py-xs text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
        >
          ← {t('previous')}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded-chip px-sm py-xs text-nav-link text-text-secondary transition-colors duration-micro hover:text-accent"
        >
          {t('next')} →
        </button>
      </div>
    </div>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
