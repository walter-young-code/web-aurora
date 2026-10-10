/**
 * 后台控件的公共类名（复用前台 design token：bg / bg-elevated / line / accent / 文本层级）。
 * 后台不投入视觉设计，只求一致、可用。
 */
export const inputCls =
  'w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent';

export const labelCls = 'mb-1 block text-sm text-text-secondary';

export const btnPrimary =
  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50';

export const btnGhost =
  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-line bg-bg-elevated px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-bg-hover disabled:opacity-50';

export const btnDanger =
  'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-danger transition-colors hover:bg-bg-hover';

export const cardCls = 'rounded-lg border border-line bg-bg-elevated p-5';
