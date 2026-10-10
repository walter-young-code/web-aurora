import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { readdir, rm, stat } from 'node:fs/promises';
import process from 'node:process';
import sharp from 'sharp';
import { computeDominantColor } from './dominant-color';
import { slugify } from './utils';

/**
 * 图片上传落本地文件系统（单容器挂卷）。
 * 上传目录相对 MEDIA_DIR（默认 ./public/media），返回站内 URL 与（图片）主色调。
 * Next 会按请求从 public 读取，运行期新增文件亦可访问；容器把 public/media 挂到卷上持久化。
 */
const mediaRoot = process.env.MEDIA_DIR ?? './public/media';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const VIDEO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};
/** 本地视频单文件上限（200MB），防止卷被大文件撑爆 */
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
/** 普通图片单文件上限（20MB），防止卷被大图撑爆 */
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * 首页 Hero 背景图约束：大图铺满首屏，需横图、足够分辨率与可控体积。
 * 校验失败抛出中文提示，供上传 action 直接回传前端 toast。
 */
const HERO_IMAGE = {
  /** 支持的 MIME（均为静态图，不含 GIF/视频） */
  formats: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const,
  /** 单张体积上限 */
  maxBytes: 8 * 1024 * 1024,
  /** 最小宽度（px） */
  minWidth: 1600,
  /** 最小宽高比（宽/高），保证横图铺满宽屏 */
  minRatio: 1.5,
  /** 文案展示用的格式要求说明 */
  label: '横图，宽高比≥ 1.5（如 16:9），宽度≥ 1600px，单张≤ 8MB，支持 JPG/PNG/WebP/AVIF',
};

/** 只允许安全的路径片段拼进落盘路径，杜绝 ../ 之类的穿越 */
function safeSeg(input: string, fallback: string): string {
  const cleaned = slugify(input);
  return cleaned.length > 0 ? cleaned : fallback;
}

export type UploadResult = { url: string; dominantColor?: string };

/**
 * @param file 上传的图片
 * @param dir  相对子目录，如 'works/<slug>'
 */
export async function uploadImage(file: File, dir: string): Promise<UploadResult> {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error(`不支持的图片类型：${file.type || '未知'}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`图片过大（上限 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB）`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // 先让 sharp 真实解码并算主色：损坏/伪装的图片在此失败，不落盘、不留孤儿文件
  const dominantColor = await computeDominantColor(Buffer.from(bytes));
  const ext = EXT[file.type] ?? 'jpg';
  // 时间戳 + 原名 slug，避免同名覆盖，也便于人工辨认
  const base = safeSeg(file.name.replace(/\.[^.]+$/, ''), 'image');
  const filename = `${Date.now()}-${base}.${ext}`;
  const relDir = dir
    .split('/')
    .map((seg) => safeSeg(seg, 'misc'))
    .join('/');

  const absDir = path.resolve(mediaRoot, relDir);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, filename), bytes);
  return { url: `/media/${relDir}/${filename}`, dominantColor };
}

/**
 * 视频上传落盘：不计算主色，仅做类型与体积闸门，返回站内 URL。
 */
export async function uploadVideo(file: File, dir: string): Promise<UploadResult> {
  if (!VIDEO_TYPES.has(file.type)) {
    throw new Error(`不支持的视频类型：${file.type || '未知'}`);
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`视频过大（上限 ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB），请改用平台链接`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = VIDEO_EXT[file.type] ?? 'mp4';
  const base = safeSeg(file.name.replace(/\.[^.]+$/, ''), 'video');
  const filename = `${Date.now()}-${base}.${ext}`;
  const relDir = dir
    .split('/')
    .map((seg) => safeSeg(seg, 'misc'))
    .join('/');

  const absDir = path.resolve(mediaRoot, relDir);
  await mkdir(absDir, { recursive: true });
  await writeFile(path.join(absDir, filename), bytes);

  return { url: `/media/${relDir}/${filename}` };
}

/**
 * 统一上传入口：按 MIME 分派图片/视频。
 */
export async function uploadMedia(file: File, dir: string): Promise<UploadResult> {
  if (VIDEO_TYPES.has(file.type)) return uploadVideo(file, dir);
  return uploadImage(file, dir);
}

/**
 * Hero 背景上传：先按 HERO_IMAGE 约束校验格式/体积/尺寸/宽高比，
 * 全部通过再复用 uploadImage 落盘并回传主色。任一不达标即抛中文错误。
 */
export async function uploadHeroImage(file: File, dir = 'hero'): Promise<UploadResult> {
  if (!HERO_IMAGE.formats.includes(file.type as (typeof HERO_IMAGE.formats)[number])) {
    throw new Error(`Hero 背景仅支持 JPG/PNG/WebP/AVIF，当前为：${file.type || '未知'}`);
  }
  if (file.size > HERO_IMAGE.maxBytes) {
    throw new Error(`Hero 背景过大（上限 ${Math.round(HERO_IMAGE.maxBytes / 1024 / 1024)}MB）`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // 以 sharp 实际解码的尺寸为准（比文件声明的 MIME 更可靠）
  const { width = 0, height = 0 } = await sharp(bytes).metadata();
  if (width === 0 || height === 0) {
    throw new Error('无法解析图片尺寸，请确认文件未损坏');
  }
  const ratio = width / height;
  if (ratio < HERO_IMAGE.minRatio) {
    throw new Error(
      `Hero 背景需为横图（宽高比≥ ${HERO_IMAGE.minRatio}:1），当前 ${width}×${height}（约 ${ratio.toFixed(2)}:1）`,
    );
  }
  if (width < HERO_IMAGE.minWidth) {
    throw new Error(`Hero 背景宽度需≥ ${HERO_IMAGE.minWidth}px，当前 ${width}px`);
  }
  return uploadImage(file, dir);
}

export type MediaItem = {
  url: string;
  /** image | video | other */
  kind: 'image' | 'video' | 'other';
  size: number;
  mtime: string;
};

const mediaRootAbs = path.resolve(/* turbopackIgnore: true */ mediaRoot);

/** 将 /media/... 站内 URL 解析为绝对路径；越界（.. / 绝对路径 / 跳出 mediaRoot）返回 null */
function resolveMediaPath(url: string): string | null {
  if (!url.startsWith('/media/')) return null;
  const rel = url.slice('/media/'.length);
  // 根目录本身不可作为目标（删除/读取都应指向具体文件）
  if (rel === '') return null;
  const abs = path.resolve(mediaRootAbs, rel);
  // 确保仍位于 mediaRoot 内，杜绝路径穿越
  if (abs !== mediaRootAbs && !abs.startsWith(mediaRootAbs + path.sep)) return null;
  return abs;
}

/** 递归扫描 mediaRoot，返回所有媒体文件的元信息（按修改时间倒序） */
export async function scanMediaFiles(): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  async function walk(dirAbs: string) {
    let entries;
    try {
      entries = await readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childAbs = path.join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        await walk(childAbs);
        continue;
      }
      if (!entry.isFile()) continue;
      const info = await stat(childAbs);
      const relUrl = `/media/${path.relative(mediaRootAbs, childAbs).split(path.sep).join('/')}`;
      const ext = path.extname(entry.name).toLowerCase();
      const kind: MediaItem['kind'] = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext)
        ? 'image'
        : ['.mp4', '.webm', '.mov'].includes(ext)
          ? 'video'
          : 'other';
      items.push({ url: relUrl, kind, size: info.size, mtime: info.mtime.toISOString() });
    }
  }
  await walk(mediaRootAbs);
  return items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
}

/** 删除一个站内媒体文件；越界拒绝，成功返回 true，文件不存在返回 false */
export async function removeMediaFile(url: string): Promise<boolean> {
  const abs = resolveMediaPath(url);
  if (!abs) throw new Error('非法的媒体路径');
  // rm({force}) 对不存在的文件不报错，这里显式区分「删掉了」与「本来就没有」
  try {
    await access(abs);
  } catch {
    return false;
  }
  await rm(abs, { force: true });
  return true;
}
