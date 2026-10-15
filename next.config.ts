import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 前台走运行期渲染（见 src/app/[locale]/layout.tsx 的 force-dynamic + connection()）：
  // 内容以 SQLite 为准，不做构建期预渲染，也不做进程内缓存，每次请求直读库，后台保存即生效。
  // standalone 产物用于单容器 Docker 部署，镜像只拷这份最小运行时。
  output: 'standalone',
  // 前台页面禁止 HTTP 缓存：确保浏览器/Nginx/CDN 不会缓存 HTML，每次刷新都回源。
  // 静态资源（_next/static）由 Next 内部设置 immutable，不受此影响。
  async headers() {
    return [
      {
        source: '/:locale(zh|en)',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/:locale(zh|en)/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
  // Server Action 默认 body 上限 1MB，媒体上传（图片≤20MB、本地视频≤200MB，见 lib/media.ts）会触发 413。
  // 此处放宽到略高于视频上限（Next 16 中该配置位于 experimental 下）；若前端还有 nginx 反代，需同步设置 client_max_body_size。
  experimental: {
    serverActions: {
      bodySizeLimit: '210mb',
    },
  },
  // sharp / Prisma / better-sqlite3 依赖原生或动态 require，交由 Node 运行时而不是打包。
  serverExternalPackages: [
    'sharp',
    '@prisma/client',
    '@prisma/adapter-better-sqlite3',
    'better-sqlite3',
  ],
  images: {
    formats: ['image/avif', 'image/webp'],
    // 后台 schema 允许 http(s) 外链封面/Hero，next/image 需显式登记远程域名，未登记的 host 会直接抛错
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default withNextIntl(nextConfig);
