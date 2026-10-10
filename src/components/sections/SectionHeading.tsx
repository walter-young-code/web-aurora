import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  title,
  action,
  className,
}: {
  title: string;
  /** 由调用方传入 <Link>，这里不关心路由类型 */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-lg flex items-end justify-between gap-md', className)}>
      <h2 className="font-display text-heading-section text-text-primary">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
