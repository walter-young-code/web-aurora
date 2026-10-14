// 把版本库里的种子媒体（media-seed/）幂等灌进运行期媒体目录 MEDIA_DIR。
// 目的：让 MEDIA_DIR 成为 /media/* 的唯一来源——读取、扫描、删除都只认这一个目录，
// 不再出现「媒体库看得见、HTTP 取不到」的双目录不一致。
// 语义：只补缺失文件，绝不覆盖（卷里用户改过的图不会被仓库版本退回）。
// 运行：npm run sync:media（npm run dev 会自动先跑一次）；容器启动补齐见 scripts/start.sh
import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedDir = join(root, 'media-seed');

/**
 * 本脚本由 npm 直接调用，不像 next 那样会自动读 .env，
 * 因此环境变量缺失时回落到 .env 里的 MEDIA_DIR，保证两边算出同一个目录。
 */
async function resolveMediaDir() {
  if (process.env.MEDIA_DIR) return resolve(process.env.MEDIA_DIR);
  try {
    const env = await readFile(join(root, '.env'), 'utf8');
    const hit = env.match(/^MEDIA_DIR\s*=\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (hit) return resolve(root, hit);
  } catch {
    // 没有 .env 就用默认值
  }
  return resolve(root, './storage/media');
}

const mediaDir = await resolveMediaDir();

/** 递归列出目录下所有文件的相对路径 */
async function listFiles(dir, base = dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(abs, base)));
    else if (entry.isFile()) files.push({ abs, rel: base ? abs.slice(base.length + 1) : entry.name });
  }
  return files;
}

async function exists(abs) {
  try {
    return (await stat(abs)).isFile();
  } catch {
    return false;
  }
}

const seeds = await listFiles(seedDir);
if (seeds.length === 0) {
  console.warn(`[sync-media] ${seedDir} 为空或缺失，跳过`);
} else {
  await mkdir(mediaDir, { recursive: true });
  let copied = 0;
  for (const seed of seeds) {
    const target = join(mediaDir, seed.rel);
    if (await exists(target)) continue;
    await mkdir(dirname(target), { recursive: true });
    await cp(seed.abs, target);
    copied++;
  }
  console.log(
    `[sync-media] ${mediaDir}：补齐 ${copied} 个种子文件（共 ${seeds.length} 个，已存在的不覆盖）`,
  );
}
