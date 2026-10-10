'use client';

import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

/**
 * 全站唯一的签名动效：Hero 主视觉随滚动 translateY + scale 1 → 1.08。
 * 子元素需自带 data-hero-visual 标记。reduced-motion 下完全不注册动画。
 */
export function HeroScrollParallax({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const scrollTrigger = {
          trigger: scope.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        } as const;

        gsap.to('[data-hero-visual]', {
          yPercent: 8,
          scale: 1.08,
          ease: 'none',
          scrollTrigger,
        });

        // 文案比底图更早离场（反向轻移 + 淡出），形成前/后景纵深。
        // data-hero-copy 在本组件 scope 之外（是 section 里的兄弟节点），
        // scoped 选择器命中不到，需从最近的 section 里显式查找。
        const copy = scope.current
          ?.closest('section')
          ?.querySelector('[data-hero-copy]');
        if (copy) {
          gsap.to(copy, {
            autoAlpha: 0,
            yPercent: -12,
            ease: 'none',
            scrollTrigger,
          });
        }
      });
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
