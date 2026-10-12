/**
 * 管理员密码维护脚本（upsert）：账号不存在则创建，存在则重置密码哈希。
 * 目的：绕过 init-admin.mjs 的「已存在即跳过」逻辑——那是生产改 .env 里
 * ADMIN_PASSWORD 却不生效（登录 401）的根因。
 *
 * 密码哈希与登录端同源（better-auth/crypto 的 scrypt），写入后立即用
 * verifyPassword 自校验，确保与 /api/auth/sign-in/email 判定一致。
 *
 * 用法：
 *   容器内（生产推荐，DATABASE_URL 已指向卷内库）：
 *     docker compose exec aurora node scripts/reset-admin-password.mjs <email> '<newPassword>'
 *   宿主机（读 .env，本地库）：
 *     node scripts/reset-admin-password.mjs <email> '<newPassword>'
 *   参数缺省时回退到环境变量 ADMIN_EMAIL / ADMIN_PASSWORD。
 */
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

/** 与 init-admin.mjs / 登录端对齐的最小密码长度 */
const MIN_PASSWORD_LENGTH = 8;

/** file:./prisma/dev.db / file:/data/aurora.db → better-sqlite3 可直接打开的路径 */
function resolveDbPath(databaseUrl) {
  if (!databaseUrl?.startsWith('file:')) return null;
  const path = databaseUrl.slice('file:'.length);
  return path.length > 0 ? path : null;
}

/** Prisma 对 SQLite 的 DateTime 存储形态（ISO 8601，+00:00 结尾） */
const nowIso = () => new Date().toISOString().replace('Z', '+00:00');

/** better-auth 的 id 为 32 位随机串；用同长度去连字符 UUID 对齐 */
const newId = () => randomUUID().replaceAll('-', '');

async function run() {
  const [emailArg, passwordArg] = process.argv.slice(2);
  const email = (emailArg || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (passwordArg || process.env.ADMIN_PASSWORD || '').trim();
  const databaseUrl = process.env.DATABASE_URL;

  if (!email) throw new Error('缺少邮箱：命令行第 1 个参数或 ADMIN_EMAIL');
  if (!password) throw new Error('缺少密码：命令行第 2 个参数或 ADMIN_PASSWORD');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`密码至少 ${MIN_PASSWORD_LENGTH} 个字符`);
  }
  const dbPath = resolveDbPath(databaseUrl);
  if (!dbPath) throw new Error('DATABASE_URL 缺失或不是 file: 协议，无法定位数据库');

  const db = new Database(dbPath);
  try {
    const hash = await hashPassword(password);
    const now = nowIso();
    const user = db.prepare('SELECT id FROM "user" WHERE email = ?').get(email);

    if (!user) {
      // 走与 init-admin 一致的 credential 约定创建：accountId = userId
      const userId = newId();
      db.transaction(() => {
        db.prepare(
          'INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES (?, ?, ?, 0, NULL, ?, ?)',
        ).run(userId, 'Admin', email, now, now);
        db.prepare(
          "INSERT INTO \"account\" (id, accountId, providerId, password, createdAt, updatedAt, userId) VALUES (?, ?, 'credential', ?, ?, ?, ?)",
        ).run(newId(), userId, hash, now, now, userId);
      })();
      console.log(`✓ 已创建管理员并设置密码：${email}`);
      return;
    }

    const account = db
      .prepare("SELECT id FROM \"account\" WHERE userId = ? AND providerId = 'credential'")
      .get(user.id);
    if (account) {
      db.prepare('UPDATE "account" SET password = ?, updatedAt = ? WHERE id = ?').run(hash, now, account.id);
    } else {
      db.prepare(
        "INSERT INTO \"account\" (id, accountId, providerId, password, createdAt, updatedAt, userId) VALUES (?, ?, 'credential', ?, ?, ?, ?)",
      ).run(newId(), user.id, hash, now, now, user.id);
    }
    db.prepare('UPDATE "user" SET updatedAt = ? WHERE id = ?').run(now, user.id);
    console.log(`✓ 已重置密码：${email}`);
  } finally {
    db.close();
  }

  // 复核：用与登录端相同的 verifyPassword 校验库中新哈希
  const verifyDb = new Database(dbPath);
  try {
    const row = verifyDb
      .prepare(
        `SELECT a.password AS hash
           FROM "user" u JOIN "account" a ON a.userId = u.id
          WHERE u.email = ? AND a.providerId = 'credential'`,
      )
      .get(email);
    if (!row) throw new Error('复核失败：未找到 credential 账户记录');
    const ok = await verifyPassword({ password, hash: row.hash });
    console.log(ok ? '✓ 校验通过，可用该密码登录' : '✗ 校验未通过，请勿使用该密码');
    if (!ok) process.exitCode = 1;
  } finally {
    verifyDb.close();
  }
}

// 载入 .env（若存在），使缺省参数与本地/容器环境一致
try {
  process.loadEnvFile();
} catch {
  // 无 .env：依赖运行时（容器）注入的环境变量
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
