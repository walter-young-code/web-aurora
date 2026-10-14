'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { jstr, jparse } from '@/lib/repo';
import { Prisma } from '@/generated/prisma/client';
import { uploadMedia, uploadHeroImage, scanMediaFiles, removeMediaFile, cleanupOldHeroImage, type MediaItem } from '@/lib/media';
import { slugify } from '@/lib/utils';
import {
  workSchema,
  recommendationSchema,
  profileSchema,
  settingsSchema,
  type WorkInput,
  type RecommendationInput,
  type ProfileInput,
  type SettingsInput,
} from './schemas';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 所有写操作先过服务端会话校验（写入层绝不信任客户端） */
async function guard() {
  const session = await requireAdmin();
  if (!session?.user) throw new Error('UNAUTHENTICATED');
}

/** 内容变更后：按 tag 强制即时失效（expire:0 = 下次请求阻塞式重算，做到即时落地），并清掉路由/客户端缓存 */
function revalidateSite() {
  revalidateTag('works', { expire: 0 });
  revalidateTag('recommendations', { expire: 0 });
  revalidateTag('profile', { expire: 0 });
  revalidatePath('/[locale]', 'layout');
  revalidatePath('/sitemap.xml');
}

function firstError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? '校验失败';
}

/** Prisma P2025：目标记录不存在（并发删除等场景，可视为幂等成功） */
function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

/** 英文标签 → 语言无关筛选键；已给则尊重手改，仅补齐空缺 */
function resolveTagKeys(input: WorkInput): string[] {
  const en = input.tags.en;
  const provided = input.tagKeys ?? [];
  return en.map((label, i) => {
    const manual = provided[i]?.trim();
    return manual && manual.length > 0 ? slugify(manual) : slugify(label);
  });
}

export async function upsertWork(input: WorkInput): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const parsed = workSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const w = parsed.data;
  const tagKeys = resolveTagKeys(w);

  const data = {
    title: jstr(w.title),
    summary: jstr(w.summary),
    type: w.type,
    cover: w.cover,
    coverRatio: w.coverRatio,
    tags: jstr(w.tags),
    tagKeys: jstr(tagKeys),
    createdAt: w.createdAt,
    featured: w.featured,
    order: w.order,
    duration: w.type === 'video' && w.duration ? w.duration : null,
    dominantColor: w.dominantColor ?? null,
    gallery: jstr(w.gallery ?? []),
    video: w.video ? jstr(w.video) : null,
  };

  const work = await prisma.work.upsert({
    where: { slug: w.slug },
    update: data,
    create: { slug: w.slug, ...data },
  });

  // 正文：非空写入/更新，空则删除该行（前台据此回落另一语言）
  await Promise.all([
    syncDoc(work.id, 'zh', w.docZh),
    syncDoc(work.id, 'en', w.docEn),
  ]);

  revalidateSite();
  return { ok: true };
}

async function syncDoc(workId: string, locale: 'zh' | 'en', body?: string) {
  const trimmed = body?.trim();
  if (!trimmed) {
    await prisma.workDoc.deleteMany({ where: { workId, locale } });
    return;
  }
  await prisma.workDoc.upsert({
    where: { workId_locale: { workId, locale } },
    update: { body: trimmed },
    create: { workId, locale, body: trimmed },
  });
}

export async function deleteWork(slug: string): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  // WorkDoc 通过 onDelete: Cascade 一并清除；记录已不存在（P2025）视为目标已达成
  try {
    await prisma.work.delete({ where: { slug } });
  } catch (error) {
    if (!isNotFound(error)) return { ok: false, error: '删除失败，请重试' };
  }
  revalidateSite();
  return { ok: true };
}

export async function reorderWorks(items: { slug: string; order: number }[]): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  try {
    await prisma.$transaction(
      items.map((it) =>
        prisma.work.update({ where: { slug: it.slug }, data: { order: it.order } }),
      ),
    );
  } catch {
    return { ok: false, error: '排序保存失败（可能有作品已被删除），请刷新后重试' };
  }
  revalidateSite();
  return { ok: true };
}

export async function upsertRecommendation(
  input: RecommendationInput,
): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const parsed = recommendationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const r = parsed.data;

  const data = {
    title: r.title,
    summary: jstr(r.summary),
    type: r.type,
    url: r.url,
    mark: r.mark,
    cover: r.cover || null,
    dominantColor: r.cover ? r.dominantColor || null : null,
    tags: jstr(r.tags),
    createdAt: r.createdAt,
  };
  await prisma.recommendation.upsert({
    where: { slug: r.slug },
    update: data,
    create: { slug: r.slug, ...data },
  });
  revalidateSite();
  return { ok: true };
}

export async function deleteRecommendation(slug: string): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  try {
    await prisma.recommendation.delete({ where: { slug } });
  } catch (error) {
    if (!isNotFound(error)) return { ok: false, error: '删除失败，请重试' };
  }
  revalidateSite();
  return { ok: true };
}

export async function upsertProfile(input: ProfileInput): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const p = parsed.data;

  const data = {
    name: jstr(p.name),
    title: jstr(p.title),
    bio: jstr(p.bio),
    avatar: p.avatar,
    socials: jstr(p.socials),
  };
  await prisma.profile.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  revalidateSite();
  return { ok: true };
}

export type UploadActionResult =
  | { ok: true; url: string; dominantColor?: string }
  | { ok: false; error: string };

/** 表单上传控件用：单独上传一张图，回传 URL（封面顺带回传主色调） */
export async function uploadMediaAction(
  formData: FormData,
): Promise<UploadActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const file = formData.get('file');
  const dir = String(formData.get('dir') ?? 'misc');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '请选择要上传的文件' };
  }
  try {
    const { url, dominantColor } = await uploadMedia(file, dir);
    return { ok: true, url, dominantColor };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '上传失败' };
  }
}

/**
 * Hero 背景专用上传：除会话校验外，服务端强制校验格式/体积/尺寸/宽高比（见 uploadHeroImage）。
 * 不信任客户端，回传新图 URL 与主色；失败返回中文错误供 toast。
 */
export async function uploadHeroImageAction(
  formData: FormData,
): Promise<UploadActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '请选择要上传的图片' };
  }
  try {
    const { url, dominantColor } = await uploadHeroImage(file);
    return { ok: true, url, dominantColor };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '上传失败' };
  }
}

// ---------- 媒体库 ----------

/** 正文中的站内媒体引用（历史手写标签 / Markdown 图片都可能出现 /media/ 路径） */
const BODY_MEDIA_RE = /\/media\/[\w./%-]+/g;

/** 收集所有被引用的站内媒体 URL（作品封面/相册/视频/海报 + 推荐封面 + 头像 + Hero 背景 + 正文） */
async function collectReferencedUrls(): Promise<Set<string>> {
  const [works, recs, profile, settings, docs] = await Promise.all([
    prisma.work.findMany({ select: { cover: true, gallery: true, video: true } }),
    prisma.recommendation.findMany({ select: { cover: true } }),
    prisma.profile.findUnique({ where: { id: 1 } }),
    prisma.siteSetting.findUnique({ where: { id: 1 }, select: { heroImage: true } }),
    prisma.workDoc.findMany({ select: { body: true } }),
  ]);
  const urls = new Set<string>();
  const add = (u?: string | null) => {
    if (u && u.startsWith('/media/')) urls.add(u);
  };
  for (const w of works) {
    add(w.cover);
    for (const img of jparse<{ src: string }[]>(w.gallery || '[]')) add(img.src);
    if (w.video) {
      const v = jparse<{ src: string; poster?: string }>(w.video);
      add(v.src);
      add(v.poster);
    }
  }
  for (const r of recs) add(r.cover);
  add(profile?.avatar);
  add(settings?.heroImage);
  // 正文里的手写引用同样算被引用（旧格式标签尚未迁到结构化字段时，防误删）
  for (const d of docs) {
    for (const m of d.body.matchAll(BODY_MEDIA_RE)) urls.add(m[0]);
  }
  return urls;
}

export type MediaListItem = MediaItem & { used: boolean };

/** 列出媒体库文件并标注是否被引用（供后台展示与删除闸门） */
export async function listMediaAction(): Promise<MediaListItem[]> {
  try {
    await guard();
  } catch {
    return [];
  }
  const [items, referenced] = await Promise.all([scanMediaFiles(), collectReferencedUrls()]);
  return items.map((it) => ({ ...it, used: referenced.has(it.url) }));
}

/** 删除未被引用的媒体文件；被引用则拒绝 */
export async function deleteMediaAction(url: string): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const referenced = await collectReferencedUrls();
  if (referenced.has(url)) return { ok: false, error: '该文件正被内容引用，无法删除' };
  try {
    const removed = await removeMediaFile(url);
    if (!removed) return { ok: false, error: '文件不存在（可能已被删除）' };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '删除失败' };
  }
}

// ---------- 站点设置 ----------

export async function upsertSettings(input: SettingsInput): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const s = parsed.data;

  // 读取旧值，用于判断是否需要清理
  const prev = await prisma.siteSetting.findUnique({ where: { id: 1 }, select: { heroImage: true } });
  const oldHero = prev?.heroImage ?? null;

  const data = {
    defaultSeoTitle: s.defaultSeoTitle,
    defaultDescription: s.defaultDescription,
    footerNote: jstr(s.footerNote),
    contactEmail: s.contactEmail,
    socials: jstr(s.socials),
    heroImage: s.heroImage?.trim() || null,
    heroColor: s.heroImage?.trim() ? s.heroColor || null : null,
  };
  await prisma.siteSetting.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });

  // Hero 背景变更时自动清理旧图（仅限 /media/hero/ 下的文件，失败不影响保存结果）
  const newHero = data.heroImage;
  if (oldHero && oldHero !== newHero) {
    await cleanupOldHeroImage(oldHero).catch(() => {});
  }

  revalidateTag('settings', { expire: 0 });
  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

// ---------- 标签管理（跨全部作品改写 tags/tagKeys） ----------

type TagEntry = { key: string; zh: string; en: string };

/** 读取全部作品，用 fn 变换其标签条目后事务写回；返回受影响作品数 */
async function mapAllWorkTags(fn: (entries: TagEntry[]) => TagEntry[]): Promise<number> {
  const works = await prisma.work.findMany();
  const ops = works.map((w) => {
    const tags = jparse<{ zh: string[]; en: string[] }>(w.tags);
    const keys = jparse<string[]>(w.tagKeys);
    const entries: TagEntry[] = keys.map((key, i) => ({
      key,
      zh: tags.zh[i] ?? key,
      en: tags.en[i] ?? key,
    }));
    const next = fn(entries);
    return prisma.work.update({
      where: { id: w.id },
      data: {
        tags: jstr({ zh: next.map((e) => e.zh), en: next.map((e) => e.en) }),
        tagKeys: jstr(next.map((e) => e.key)),
      },
    });
  });
  await prisma.$transaction(ops);
  return works.length;
}

/** 重命名标签：更新中英文案，并按新英文重算 tagKey */
export async function renameTagAction(
  oldKey: string,
  labelZh: string,
  labelEn: string,
): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  const newKey = slugify(labelEn);
  await mapAllWorkTags((entries) =>
    entries.map((e) => (e.key === oldKey ? { key: newKey, zh: labelZh, en: labelEn } : e)),
  );
  revalidateSite();
  return { ok: true };
}

/** 合并标签：把 fromKey 归并到 toKey，同一作品内去重 */
export async function mergeTagsAction(fromKey: string, toKey: string): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  await mapAllWorkTags((entries) => {
    const merged = entries.map((e) => (e.key === fromKey ? { ...e, key: toKey } : e));
    const seen = new Set<string>();
    return merged.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  });
  revalidateSite();
  return { ok: true };
}
/** 删除标签：从全部作品移除该 key */
export async function deleteTagAction(key: string): Promise<ActionResult> {
  try {
    await guard();
  } catch {
    return { ok: false, error: '登录已过期，请重新登录' };
  }
  await mapAllWorkTags((entries) => entries.filter((e) => e.key !== key));
  revalidateSite();
  return { ok: true };
}
