import { notFound } from 'next/navigation';

/**
 * locale 下未匹配任何路由的地址（/zh/foo）默认会落到 Next 内置的白底 404，
 * 因为它找不到 [locale] 之外的 not-found 边界。这一层 catch-all 把它接进
 * [locale]/not-found.tsx，404 因此保留页头、页脚与暗色底。
 */
export default function LocaleCatchAll() {
  notFound();
}
