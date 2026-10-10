import Link from 'next/link';

/**
 * 404 不带 locale：Next 16 在 `dynamicParams = false` 时会在 [locale] 布局之外预渲染这个边界，
 * 此时拿不到 route params（见 works/[slug]/page.tsx 的 dynamicParams）。
 * 404 采用一行双语提示，所以中英直接并列写死，不依赖 i18n 上下文。
 */
export default function NotFound() {
  return (
    <section className="hero-full page-container flex flex-col items-start justify-center gap-md pb-xxl">
      <p className="text-meta-caption text-text-muted">404</p>
      <h1 className="font-display text-heading-section text-text-primary">
        页面不存在
        <span className="text-text-secondary"> / Page not found</span>
      </h1>
      <p className="max-w-prose text-body-md text-text-secondary">
        这个地址没有对应的内容，可能已经改名或从未存在。
        <br />
        There is nothing at this address — it may have been renamed, or never existed.
      </p>
      <Link
        href="/"
        className="mt-md inline-flex h-11 items-center rounded-chip bg-accent px-md text-nav-link text-on-primary transition-opacity duration-micro hover:opacity-90"
      >
        回到首页 / Back to home
      </Link>
    </section>
  );
}
