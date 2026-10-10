/**
 * scripts/init-admin.mjs 的类型声明（供 prisma/seed.ts 导入使用）。
 */
export function ensureAdmin(options: {
  databaseUrl: string | undefined;
  email: string | undefined;
  password: string | undefined;
  logger?: { log: (message: string) => void };
}): Promise<boolean>;
