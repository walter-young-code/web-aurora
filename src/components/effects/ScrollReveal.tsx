'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** 子项之间的入场间隔；不传则整体作为一个元素入场 */
  stagger?: number;
};

/**
 * 全站统一的入场动效：fade + 上移 24px，0.6s power2.out。
 * 全站只允许这一种入场方式，区块不要各自发明动画。
 */
export function ScrollReveal({ children, as, className, stagger }: Props) {
  const Tag = (as ?? 'div') as ElementType;
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const targets = stagger
          ? gsap.utils.toArray<HTMLElement>('[data-reveal]', container.current as HTMLElement)
          : [container.current];

        gsap.from(targets, {
          autoAlpha: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          stagger,
          scrollTrigger: {
            trigger: container.current,
            start: 'top 85%',
            once: true,
          },
        });
      });
    },
    { scope: container },
  );

  return (
    <Tag ref={container} className={className} data-reveal={stagger ? undefined : true}>
      {children}
    </Tag>
  );
}
