import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';

/**
 * 解析逗号分隔的额外可信来源（如裸域名 + www、未来的 https）。
 * 每项去空白、过滤空串；末尾斜杠无影响（better-auth 按 origin 比对）。
 */
function parseTrustedOrigins(value: string | undefined): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

const DEV_ORIGIN = 'http://localhost:3000';

/**
 * Better Auth（账号密码）实例，供 /admin 服务端鉴权与 API 路由使用。
 * - baseURL / secret 由运行时环境变量 BETTER_AUTH_URL、AUTH_SECRET 提供（better-auth 自动读取）。
 * - 数据库走 Prisma adapter + SQLite：表 user/session/account/verification 已在 schema.prisma 定义。
 * - 单容器长期运行，session 存 Cookie，重启后凭 Cookie 仍可校验。
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  emailAndPassword: {
    enabled: true,
    // 后台仅本人使用：关闭公开注册端点，账号只由 seed / scripts/init-admin.mjs 直写创建
    disableSignUp: true,
    autoSignIn: true,
  },
  // BETTER_AUTH_URL 始终放行；AUTH_TRUSTED_ORIGINS 再补充其余同源变体（去重）
  trustedOrigins: [
    ...new Set([
      process.env.BETTER_AUTH_URL ?? DEV_ORIGIN,
      ...parseTrustedOrigins(process.env.AUTH_TRUSTED_ORIGINS),
    ]),
  ],
});

/** 服务端读取当前登录会话（admin layout 守卫与每个写 action 都调用它） */
export async function requireAdmin() {
  const { headers } = await import('next/headers');
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}
