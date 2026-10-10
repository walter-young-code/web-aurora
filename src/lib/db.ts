import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Prisma 7 单例：SQLite 走 better-sqlite3 驱动适配器（Prisma 7 强制 driver adapter）。
 * DATABASE_URL 形如 file:./prisma/dev.db（本地）或 file:/data/aurora.db（容器卷内）。
 * 开发热重载下挂到 globalThis，避免反复 new 造成连接/文件句柄泄漏。
 */
const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
