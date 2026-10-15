import { prisma } from './db';
import { jparse, rowToWork, rowToRecommendation } from './repo';
import type { Locale, Localized } from '@/types/localized';
import type { Recommendation } from '@/types/recommendation';
import type { Work } from '@/types/work';

export type Profile = {
  name: Localized;
  title: Localized;
  bio: Localized;
  avatar: string;
  socials: { platform: string; url: string }[];
};

/**
 * 内容一律来自 SQLite（Prisma 7），每次请求直读库，不做进程内缓存。
 * layout 已声明 force-dynamic，前台每个请求都走运行期渲染；
 * SQLite 单文件本地读延迟 <1ms，对个人作品站流量完全够用，
 * 彻底规避 unstable_cache tag 失效在 standalone 容器里不可靠的问题。
 */

export async function getProfile(): Promise<Profile> {
  const row = await prisma.profile.findUnique({ where: { id: 1 } });
  if (!row) throw new Error('profile 未初始化，请先执行 prisma db seed');
  return {
    name: jparse<Localized>(row.name),
    title: jparse<Localized>(row.title),
    bio: jparse<Localized>(row.bio),
    avatar: row.avatar,
    socials: jparse<Profile['socials']>(row.socials),
  };
}

export type Settings = {
  defaultSeoTitle: string;
  defaultDescription: string;
  footerNote: Localized;
  contactEmail: string;
  socials: { platform: string; url: string }[];
  /** 首页 Hero 背景图（站内 /media/ 路径）；null 表示回落精选作品封面 */
  heroImage: string | null;
  /** Hero 背景主色（占位铺底） */
  heroColor: string | null;
};

/** 站点级设置（单行）。行缺失时回落到硬编码默认，保证前台不因未 seed 而崩。 */
export async function getSettings(): Promise<Settings> {
  const row = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!row) {
    return {
      defaultSeoTitle: 'Aurora',
      defaultDescription: '',
      footerNote: { zh: '', en: '' },
      contactEmail: '',
      socials: [],
      heroImage: null,
      heroColor: null,
    };
  }
  return {
    defaultSeoTitle: row.defaultSeoTitle,
    defaultDescription: row.defaultDescription,
    footerNote: jparse<Localized>(row.footerNote),
    contactEmail: row.contactEmail,
    socials: jparse<Settings['socials']>(row.socials),
    heroImage: row.heroImage ?? null,
    heroColor: row.heroColor ?? null,
  };
}

export async function getWorks(): Promise<Work[]> {
  const rows = await prisma.work.findMany({ orderBy: { order: 'asc' } });
  return rows.map(rowToWork);
}

export async function getWork(slug: string): Promise<Work | undefined> {
  const row = await prisma.work.findUnique({ where: { slug } });
  return row ? rowToWork(row) : undefined;
}

/** 首页精选：featured 优先，其余按 order 补足到 limit 件 */
export async function getHomeWorks(limit = 6): Promise<Work[]> {
  const works = await getWorks();
  const featured = works.filter((work) => work.featured);
  const rest = works.filter((work) => !work.featured);
  return [...featured, ...rest].slice(0, limit);
}

/** 上一篇/下一篇按 order 环形相邻；作品 <=1 时无相邻，避免单作品时上一篇/下一篇指向自身 */
export async function getAdjacentWorks(
  slug: string,
): Promise<{ previous: Work | undefined; next: Work | undefined }> {
  const works = await getWorks();
  if (works.length <= 1) return { previous: undefined, next: undefined };
  const index = works.findIndex((work) => work.slug === slug);
  if (index === -1) return { previous: undefined, next: undefined };
  return {
    previous: works[(index - 1 + works.length) % works.length],
    next: works[(index + 1) % works.length],
  };
}

export type TagOption = {
  key: string;
  label: Localized;
};

/** 从作品数据聚合出语言无关的标签筛选项，按首次出现顺序 */
export async function getTagOptions(): Promise<TagOption[]> {
  const works = await getWorks();
  const byKey = new Map<string, TagOption>();
  for (const work of works) {
    work.tagKeys.forEach((key, i) => {
      if (byKey.has(key)) return;
      byKey.set(key, {
        key,
        label: { zh: work.tags.zh[i] ?? key, en: work.tags.en[i] ?? key },
      });
    });
  }
  return [...byKey.values()];
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const rows = await prisma.recommendation.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(rowToRecommendation);
}

export async function getRecommendation(slug: string): Promise<Recommendation | undefined> {
  const row = await prisma.recommendation.findUnique({ where: { slug } });
  return row ? rowToRecommendation(row) : undefined;
}

export type LocalizedDoc = {
  /** 当前 locale 的 MDX 正文；缺失时为空字符串 */
  body: string;
  /** 当前语言是否有独立记录，false 表示回落显示 */
  hasOwnTranslation: boolean;
  frontmatter: Record<string, unknown>;
};

/**
 * MDX 正文按语言存于 WorkDoc（每作品两行 zh/en）。某语言缺失时回落另一语言并让页面显示提示，
 * 不 404。
 */
export async function readWorkDoc(slug: string, locale: Locale): Promise<LocalizedDoc> {
  const own = await prisma.workDoc.findFirst({
    where: { work: { slug }, locale },
  });
  if (own) return { body: own.body, hasOwnTranslation: true, frontmatter: {} };

  // 回落：取该作品任意语言的正文
  const fallback = await prisma.workDoc.findFirst({ where: { work: { slug } } });
  if (fallback) return { body: fallback.body, hasOwnTranslation: false, frontmatter: {} };

  return { body: '', hasOwnTranslation: false, frontmatter: {} };
}
