'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DominantColorImage } from './DominantColorImage';

type Props = {
  /** B站 / YouTube 的 embed 地址，或 /media/... 下的本地视频 */
  src: string;
  poster?: string;
  title?: string;
};

function isLocalSource(src: string) {
  return src.startsWith('/media/') || /\.(mp4|webm|mov)(\?|$)/i.test(src);
}

/** 点击之前不请求任何第三方资源，也不下载视频 */
function enableAutoplay(src: string) {
  if (src.includes('autoplay=0')) return src.replace('autoplay=0', 'autoplay=1');
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}autoplay=1`;
}

export function LazyVideoEmbed({ src, poster, title }: Props) {
  const t = useTranslations('media');
  const [active, setActive] = useState(false);
  const [missing, setMissing] = useState(false);
  const local = isLocalSource(src);
  const label = title ?? t('play');

  return (
    <div className="my-lg aspect-video overflow-hidden rounded-card bg-bg-elevated">
      {active ? (
        local ? (
          missing ? (
            <div className="grid h-full w-full place-content-center gap-xs p-lg text-center">
              <p className="text-meta-caption text-text-secondary">{t('samplePending')}</p>
              <code className="font-mono text-meta-caption text-text-muted">{src}</code>
            </div>
          ) : (
            <video
              src={src}
              controls
              autoPlay
              preload="auto"
              poster={poster}
              className="h-full w-full object-contain"
              aria-label={label}
              onError={() => setMissing(true)}
            />
          )
        ) : (
          <iframe
            src={enableAutoplay(src)}
            title={label}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0"
          />
        )
      ) : (
        <div className="relative h-full w-full">
          {poster ? (
            <DominantColorImage
              src={poster}
              alt=""
              sizes="(max-width: 1023px) 92vw, 70vw"
              className="h-full w-full"
              imgClassName="opacity-70"
            />
          ) : null}
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={t('playAria', { title: label })}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-on-primary transition-opacity duration-micro hover:opacity-90">
              <svg viewBox="0 0 14 18" aria-hidden="true" className="ml-1 h-4 w-3 fill-current">
                <path d="M0 0l14 9-14 9z" />
              </svg>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
