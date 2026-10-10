/**
 * 数据播种：把 src/content/** 的 JSON + MDX 夹具写入 SQLite（本地初始化与构建期种子库共用）。
 * 正文里的旧格式媒体标签（<ImageGallery/> / <LazyVideoEmbed/>）在播种时提取为结构化
 * gallery/video 字段，正文同步去掉标签行——前台「结构化区 + 正文」不会重复渲染。
 * 管理员账号（ADMIN_EMAIL/ADMIN_PASSWORD）委托 scripts/init-admin.mjs 幂等直写
 * （注册端点已关闭，不再走 signUpEmail）。
 *
 * 运行：npm run db:seed（tsx 执行，解析 @/ 别名与 Prisma ESM 生成物）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { ensureAdmin } from '../scripts/init-admin.mjs';

const contentDir = path.join(process.cwd(), 'src', 'content');
const jstr = (value: unknown): string => JSON.stringify(value);

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(contentDir, rel), 'utf8')) as T;
}

/** 若 {slug}.{locale}.mdx 存在则返回原文（含 frontmatter，MdxArticle 会自行剥离） */
function readMdx(dir: string, slug: string, locale: 'zh' | 'en'): string | null {
  const file = path.join(contentDir, dir, `${slug}.${locale}.mdx`);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

type Localized<T = string> = { zh: T; en: T };
type RawWork = {
  slug: string;
  title: Localized;
  summary: Localized;
  type: string;
  cover: string;
  coverRatio: number;
  tags: Localized<string[]>;
  tagKeys: string[];
  createdAt: string;
  featured: boolean;
  order: number;
  duration?: string;
  dominantColor?: string;
};
type RawRecommendation = {
  slug: string;
  title: string;
  summary: Localized;
  type: string;
  url: string;
  mark: string;
  tags: string[];
  createdAt: string;
};
type RawProfile = {
  name: Localized;
  title: Localized;
  bio: Localized;
  avatar: string;
  socials: { platform: string; url: string }[];
};

type GalleryImage = { src: string };
type VideoAsset = {
  kind: 'local' | 'embed';
  src: string;
  poster?: string;
  title?: Localized;
};

/** 从标签串里取属性值（夹具标签形如 <LazyVideoEmbed src="..." poster="..." />） */
function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1];
}

/** 提取 <ImageGallery images="a,b,c"/> 并移除标签行 */
function extractGallery(body: string): { images: GalleryImage[]; body: string } {
  const images: GalleryImage[] = [];
  const out = body.replace(/<ImageGallery\b[^>]*\/>\s*\n?/g, (tag) => {
    const raw = attr(tag, 'images') ?? '';
    for (const src of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!images.some((i) => i.src === src)) images.push({ src });
    }
    return '';
  });
  return { images, body: out };
}

/** 提取首个 <LazyVideoEmbed .../> 并移除标签行；title 文本按 locale 收集，由调用方合成双语 */
function extractVideo(body: string): {
  video: { kind: VideoAsset['kind']; src: string; poster?: string; titleText?: string } | null;
  body: string;
} {
  let video: { kind: VideoAsset['kind']; src: string; poster?: string; titleText?: string } | null =
    null;
  const out = body.replace(/<LazyVideoEmbed\b[^>]*\/>\s*\n?/g, (tag) => {
    if (video) return '';
    const src = attr(tag, 'src') ?? '';
    if (!src) return tag;
    const poster = attr(tag, 'poster');
    const titleText = attr(tag, 'title');
    const kind: VideoAsset['kind'] =
      src.startsWith('/media/') || /\.(mp4|webm|mov)(\?|$)/i.test(src) ? 'local' : 'embed';
    video = { kind, src, ...(poster ? { poster } : {}), ...(titleText ? { titleText } : {}) };
    return '';
  });
  return { video, body: out };
}

async function main() {
  // 先载入 .env，再动态 import db/auth，确保 DATABASE_URL 等在模块初始化前就位
  try {
    process.loadEnvFile();
  } catch {
    // 无 .env：依赖运行时注入的环境变量（容器）
  }

  const { prisma } = await import('@/lib/db');

  async function seedProfile() {
    const p = readJson<RawProfile>('profile.json');
    await prisma.profile.upsert({
      where: { id: 1 },
      update: {
        name: jstr(p.name),
        title: jstr(p.title),
        bio: jstr(p.bio),
        avatar: p.avatar,
        socials: jstr(p.socials),
      },
      create: {
        id: 1,
        name: jstr(p.name),
        title: jstr(p.title),
        bio: jstr(p.bio),
        avatar: p.avatar,
        socials: jstr(p.socials),
      },
    });
    console.log('✓ profile');
  }

  async function seedWorks() {
    const works = readJson<RawWork[]>('works/index.json');
    for (const w of works) {
      // 先逐语言读夹具正文：提取结构化相册/视频，正文同步去掉标签行（写入库的都是无标签正文）
      const docs: Partial<Record<'zh' | 'en', string>> = {};
      const titles: Partial<Record<'zh' | 'en', string>> = {};
      let gallery: GalleryImage[] = [];
      let videoBase: { kind: VideoAsset['kind']; src: string; poster?: string } | null = null;

      for (const locale of ['zh', 'en'] as const) {
        const raw = readMdx('works', w.slug, locale);
        if (raw == null) continue;
        const g = extractGallery(raw);
        if (gallery.length === 0) gallery = g.images;
        const v = extractVideo(g.body);
        if (v.video) {
          videoBase ??= {
            kind: v.video.kind,
            src: v.video.src,
            ...(v.video.poster ? { poster: v.video.poster } : {}),
          };
          if (v.video.titleText) titles[locale] = v.video.titleText;
        }
        docs[locale] = v.body.trim();
      }

      const video: VideoAsset | null = videoBase
        ? {
            ...videoBase,
            ...(titles.zh || titles.en
              ? { title: { zh: titles.zh ?? titles.en ?? '', en: titles.en ?? titles.zh ?? '' } }
              : {}),
          }
        : null;

      const data = {
        title: jstr(w.title),
        summary: jstr(w.summary),
        type: w.type,
        cover: w.cover,
        coverRatio: w.coverRatio,
        tags: jstr(w.tags),
        tagKeys: jstr(w.tagKeys),
        createdAt: w.createdAt,
        featured: w.featured,
        order: w.order,
        duration: w.duration ?? null,
        dominantColor: w.dominantColor ?? null,
        gallery: jstr(gallery),
        video: video ? jstr(video) : null,
      };
      const work = await prisma.work.upsert({
        where: { slug: w.slug },
        update: data,
        create: { slug: w.slug, ...data },
      });

      for (const locale of ['zh', 'en'] as const) {
        const body = docs[locale];
        if (body == null) continue;
        await prisma.workDoc.upsert({
          where: { workId_locale: { workId: work.id, locale } },
          update: { body },
          create: { workId: work.id, locale, body },
        });
      }
    }
    console.log(`✓ works: ${works.length}`);
  }

  async function seedRecommendations() {
    const recs = readJson<RawRecommendation[]>('recommendations/index.json');
    for (const r of recs) {
      const data = {
        title: r.title,
        summary: jstr(r.summary),
        type: r.type,
        url: r.url,
        mark: r.mark,
        tags: jstr(r.tags),
        createdAt: r.createdAt,
      };
      await prisma.recommendation.upsert({
        where: { slug: r.slug },
        update: data,
        create: { slug: r.slug, ...data },
      });
    }
    console.log(`✓ recommendations: ${recs.length}`);
  }

  async function seedAdmin() {
    await ensureAdmin({
      databaseUrl: process.env.DATABASE_URL,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
  }

  await seedProfile();
  await seedWorks();
  await seedRecommendations();
  await seedAdmin();
}

main()
  .then(async () => {
    const { prisma } = await import('@/lib/db');
    await prisma.$disconnect();
    console.log('seed 完成');
  })
  .catch(async (error) => {
    console.error(error);
    const { prisma } = await import('@/lib/db');
    await prisma.$disconnect();
    process.exit(1);
  });
