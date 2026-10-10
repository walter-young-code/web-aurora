import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth 浏览器端客户端。
 * 与 /api/auth/[...all] 同源，basePath 用默认的 /api/auth。仅登录、登出。
 */
export const authClient = createAuthClient({});

export const { signIn, signOut } = authClient;
