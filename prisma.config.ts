// Prisma 7 配置文件：CLI（migrate / db push / generate）从这里读连接串与迁移目录。
// Prisma 7 起，datasource.url 不再写在 schema.prisma，而在此提供。
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// 本地开发把 .env 载入 process.env（生产/容器由运行环境直接注入，缺文件时忽略）。
try {
  process.loadEnvFile();
} catch {
  // 无 .env 文件：依赖运行时已注入的环境变量
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    // 本地开发：file:./prisma/dev.db；单容器挂卷：file:/data/aurora.db（由环境变量注入）
    url: env('DATABASE_URL'),
  },
});
