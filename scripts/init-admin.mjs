/**
 * 幂等创建管理员账号：不依赖 Next / Prisma 生成物，供两处复用——
 *   1. prisma/seed.ts（本地播种与构建期种子库）；
 *   2. scripts/start.sh（容器每次启动按环境变量补建，已存在则跳过）。
 * 注册端点已关闭（auth.ts disableSignUp），这里按 better-auth 的 credential 约定
 * 直写 user/account 两表；密码走与登录端同一个 hashPassword（scrypt）。
 * 手动运行：node scripts/init-admin.mjs（优先读 .env，缺省用进程环境变量）
 */
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { hashPassword } from 'better-auth/crypto';

/** 与登录端 assertPasswordNotTooShort 对齐的最小密码长度 */
const MIN_PASSWORD_LENGTH = 8;

/** file:./prisma/dev.db / file:/data/aurora.db → better-sqlite3 可直接打开的路径 */
function resolveDbPath(databaseUrl) {
  if (!databaseUrl?.startsWith('file:')) return null;
  const path = databaseUrl.slice('file:'.length);
  return path.length > 0 ? path : null;
}

/** Prisma 对 SQLite 的 DateTime 存储形态（ISO 8601，+00:00 结尾） */
const nowIso = () => new Date().toISOString().replace('Z', '+00:00');

/** better-auth 的 id 为 32 位随机串；这里用同长度的十六进制 UUID 去连字符 */
const newId = () => randomUUID().replaceAll('-', '');

/**
 * @param {object} options
 * @param {string | undefined} options.databaseUrl file: 协议的 SQLite 连接串
 * @param {string | undefined} options.email
 * @param {string | undefined} options.password
 * @param {{ log: (message: string) => void }} [options.logger]
 * @returns {Promise<boolean>} 是否新建了账号（已存在/未配置返回 false）
 */
export async function ensureAdmin({ databaseUrl, email, password, logger = console }) {
  if (!email || !password) {
    logger.log('- admin 跳过（未设置 ADMIN_EMAIL / ADMIN_PASSWORD）');
    return false;
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD 至少 ${MIN_PASSWORD_LENGTH} 个字符`);
  }
  const dbPath = resolveDbPath(databaseUrl);
  if (!dbPath) throw new Error('DATABASE_URL 缺失或不是 file: 协议，无法建号');

  const db = new Database(dbPath);
  try {
    const normalizedEmail = email.toLowerCase();
    const existing = db.prepare('SELECT id FROM "user" WHERE email = ?').get(normalizedEmail);
    if (existing) {
      logger.log(`- admin 已存在：${normalizedEmail}`);
      return false;
    }
    const hash = await hashPassword(password);
    const now = nowIso();
    const userId = newId();
    db.transaction(() => {
      db.prepare(
        'INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES (?, ?, ?, 0, NULL, ?, ?)',
      ).run(userId, 'Admin', normalizedEmail, now, now);
      // credential account 约定（与 better-auth 注册路径一致）：accountId = userId
      db.prepare(
        'INSERT INTO "account" (id, accountId, providerId, password, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(newId(), userId, 'credential', hash, now, now, userId);
    })();
    logger.log(`✓ admin: ${normalizedEmail}`);
    return true;
  } finally {
    db.close();
  }
}

// 直接运行（node scripts/init-admin.mjs）：先载入 .env，再按环境变量幂等建号
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile();
  } catch {
    // 无 .env：依赖运行时（容器）注入的环境变量
  }
  ensureAdmin({
    databaseUrl: process.env.DATABASE_URL,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
