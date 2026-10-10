'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 *
 * 必须经 Portal 挂到 body：Lightbox 的调用方都嵌在 ScrollReveal 里，
 * GSAP 入场动画在祖先元素上留下的 transform 会成为 fixed 的包含块，
 * 导致弹层随页面滚动偏移、溢出部分无法滚回。
 */
export function Lightbox({ images, index, altPrefix, onClose, onIndexChange }: Props) {
  const t = useTranslations('lightbox');
  const dialogRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  // Portal 目标只在客户端存在，首帧不渲染，避免 SSR  hydration 不匹配
  const [mounted, setMounted] = useState(false);

  const total = images.length;
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + total) % total),
    [index, onIndexChange, total],
  );

  useEffect(() => {
    setMounted(true);
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    // body overflow:hidden 会抽走滚动条，补一个等宽 padding 防止背后内容横跳
    if (scrollbarGap > 0) document.body.style.paddingRight = `${scrollbarGap}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      // preventScroll：默认 focus 会把触发按钮滚进视野，关闭弹层时应保持原滚动位置
      restoreFocusTo.current?.focus({ preventScroll: true });
    };
  }, []);

  // 换张时重置滚动位置，避免上一张滚到半途的状态带到新图上
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, left: 0 });
  }, [index]);

  // Portal 首帧之后 dialog 才存在，焦点落到弹层自身
  useEffect(() => {
    if (mounted) dialogRef.current?.focus();
  }, [mounted]);

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

  if (!mounted) return null;

  return createPortal(
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

      {/* grid + place-items 居中在溢出时是「安全居中」：不会像 flex 那样把顶部/左侧裁成滚不回去的死角 */}
      <div
        ref={stageRef}
        className="relative grid flex-1 place-items-center overflow-auto px-sm pb-lg"
      >
        <Image
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt ?? t('imageAlt', { index: index + 1, total })}
          width={1600}
          height={1100}
          sizes="100vw"
          className="max-h-full w-auto min-w-0 shrink-0 object-contain"
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
    </div>,
    document.body,
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
