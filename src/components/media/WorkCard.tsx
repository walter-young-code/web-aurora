import type { Locale } from '@/types/localized';
import type { Work } from '@/types/work';
import { Link } from '@/i18n/routing';
import { cn, coverAspectClass } from '@/lib/utils';
import { DominantColorImage } from './DominantColorImage';

// 与 WorksGallery 的 1 → sm:2 → lg:3 → xl:4 列一一对应，写错会让 next/image 取到偏小的源图
const CARD_SIZES = '(max-width: 639px) 90vw, (max-width: 1023px) 46vw, (max-width: 1279px) 31vw, 23vw';
const FEATURED_SIZES = '(max-width: 639px) 90vw, (max-width: 1023px) 94vw, (max-width: 1279px) 64vw, 47vw';

type Props = {
  work: Work;
  locale: Locale;
  /** Bento 里的 2×2 大格 */
  isFeatured?: boolean;
  priority?: boolean;
};

export function WorkCard({ work, locale, isFeatured = false, priority = false }: Props) {
  return (
    <article
      data-reveal
      className={cn(
        'group relative',
        // Bento 的行单位 = 一张横图。横图 1×1，竖图占 1 列 × 2 行（否则同一行里横图会被
        // stretch 拉成竖图的高度，3:2 只剩中间 44%）。featured 的 2×2 只在 ≥3 列时成立：
        // 单列下跨列会撑出 implicit 轨道，2 列下跨行会让它独占的两行没有兄弟卡片而塌成 0 高。
        isFeatured ? 'sm:col-span-2 lg:row-span-2' : work.coverRatio === 0.67 ? 'sm:row-span-2' : '',
      )}
    >
      <Link
        href={`/works/${work.slug}`}
        className="flex h-full cursor-zoom-in flex-col"
      >
        <div
          className={cn(
            'relative flex-1 overflow-hidden rounded-card',
            // featured 始终自带 3:2 作为高度来源（不再在 lg 改 aspect-auto）：
            // aspect-auto 把行高外包给同排兄弟卡，一旦多张 featured 占满整行（xl 4 列并排）
            // 就没有卡为它们跨的行供高 → 行塌成 16px。自带 aspect 后无论 featured 几张都不塌。
            isFeatured ? 'aspect-cover-landscape' : coverAspectClass(work.coverRatio),
          )}
        >
          <DominantColorImage
            src={work.cover}
            alt={work.title[locale]}
            dominantColor={work.dominantColor}
            sizes={isFeatured ? FEATURED_SIZES : CARD_SIZES}
            priority={priority}
            className="h-full w-full"
            imgClassName="transition-transform duration-hover ease-out-soft group-hover:scale-[1.03]"
          />

          {work.type === 'video' && work.duration ? (
            <span className="absolute bottom-xs right-xs flex items-center gap-xxs rounded-badge bg-bg/80 px-xs py-xxs text-meta-caption text-text-secondary">
              <svg viewBox="0 0 8 10" aria-hidden="true" className="h-2.5 w-2 fill-current">
                <path d="M0 0l8 5-8 5z" />
              </svg>
              {work.duration}
            </span>
          ) : null}

          {/* 说明条常驻（触屏与键盘可达性优先），hover 时上浮并压深遮罩。
              末端用 to-bg/0 而非 to-transparent：transparent=透明黑，插值会带出灰暗硬边；
              同色相淡到 alpha 0 才是柔和过渡。中间停止点下移到 40% 让淡出跨度更长、更自然。 */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 via-40% to-bg/0 p-sm transition-all duration-micro ease-out-soft group-hover:-translate-y-xxs group-hover:p-md">
            <h3
              className={cn(
                'font-display text-text-primary',
                isFeatured ? 'text-heading-section' : 'text-heading-card',
              )}
            >
              {work.title[locale]}
            </h3>
            <p className="mt-xxs text-meta-caption text-text-muted">
              {work.tags[locale].slice(0, 2).join(' · ')}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
