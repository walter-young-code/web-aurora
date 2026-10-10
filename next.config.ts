import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 全站预渲染 + ISR：前台页面构建期铺量、运行期按需重渲染。
  // standalone 产物用于单容器 Docker 部署，镜像只拷这份最小运行时。
  output: 'standalone',
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
