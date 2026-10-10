import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

/**
 * Better Auth 的 catch-all 路由：登录/登出/会话等全部由它承接。
 * proxy.ts 已放行 /api，故该路由不参与 locale 协商。
 */
export const { GET, POST } = toNextJsHandler(auth);
