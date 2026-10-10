import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Next 16 已把 middleware 改名为 proxy；运行时固定为 nodejs（edge 不再受支持），
 * 这里只做 locale 判定与重定向，不碰数据库、不做鉴权。
 */
export default createMiddleware(routing);

export const config = {
  // API、后台、静态资源与 SEO 文件不参与 locale 协商（admin 不带语言前缀、界面仅中文）
  matcher: '/((?!api|admin|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|media/).*)',
};
