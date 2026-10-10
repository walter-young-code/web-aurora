'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  src: string;
  alt: string;
  /** 构建时由 extract-dominant-colors 写入的主色，图片到位前用它铺底 */
  dominantColor?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
};

/**
 * 主色调占位 + 淡入：图片就绪前用封面主色铺底，杜绝白块闪烁与 CLS。
 * 加载失败退到 bg-elevated 灰底，不留空洞。
 */
export function DominantColorImage({
  src,
  alt,
  dominantColor,
  sizes,
  priority = false,
  className,
  imgClassName,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn('cover-placeholder relative overflow-hidden rounded-card', className)}
      style={{ '--cover-color': dominantColor } as CSSProperties}
    >
      {failed ? (
        <div className="absolute inset-0 grid place-items-center bg-bg-elevated">
          <span className="text-meta-caption text-text-muted">—</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'object-cover opacity-0',
            loaded && 'cover-image-loaded',
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
