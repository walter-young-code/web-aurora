import { z } from 'zod';

/**
 * 后台写入校验。这些 schema 复刻 src/types 的约束：
 * - 双语字段 {zh,en} 必填（正文允许缺一语言，走前台回落）；
 * - coverRatio 仅 1.5 | 0.67；featured=true 强制横图（1.5）；
 * - duration 仅 video 允许，且形如 mm:ss；
 * - tagKeys 与 tags 一一对应；缺省时由英文标签 slugify 生成。
 */

const localized = z.object({ zh: z.string(), en: z.string() });
const localizedNonEmpty = z.object({
  zh: z.string().min(1, '中文必填'),
  en: z.string().min(1, 'English required'),
});

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 yyyy-MM-dd');

export const slugSchema = z
  .string()
  .min(2, 'slug 太短')
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能用小写字母、数字与连字符');

const tagPair = z
  .object({ zh: z.array(z.string()), en: z.array(z.string()) })
  .refine((t) => t.zh.length === t.en.length, {
    message: '中英标签数量必须一致',
  });

/** 相册单图：src 必填，alt/主色可缺省 */
const galleryImageSchema = z.object({
  src: z.string().min(1, '图片地址不能为空'),
  alt: localized.optional(),
  dominantColor: z.string().optional(),
});

/** 视频素材：local 需站内 /media/ 路径，embed 需 http(s) 链接 */
const videoAssetSchema = z
  .object({
    kind: z.enum(['local', 'embed']),
    src: z.string().min(1, '请上传视频或填写链接'),
    poster: z.string().optional(),
    title: localized.optional(),
  })
  .refine(
    (v) =>
      v.kind === 'local'
        ? v.src.startsWith('/media/')
        : /^https?:\/\//.test(v.src),
    { message: '本地视频需以 /media/ 开头，平台链接需为 http(s) 地址', path: ['src'] },
  );

export const workSchema = z
  .object({
    slug: slugSchema,
    title: localizedNonEmpty,
    summary: localizedNonEmpty,
    type: z.enum(['photography', 'video']),
    cover: z.string().min(1, '请上传或填写封面'),
    coverRatio: z.union([z.literal(1.5), z.literal(0.67)]),
    tags: tagPair,
    tagKeys: z.array(z.string()),
    createdAt: dateStr,
    featured: z.boolean(),
    order: z.coerce.number().int(),
    duration: z.string().optional(),
    dominantColor: z.string().optional(),
    // 结构化相册/视频（前台详情页据此渲染）
    gallery: z.array(galleryImageSchema).default([]),
    video: videoAssetSchema.nullable().optional(),
    // MDX 正文：两种语言都允许留空（留空即回落另一语言）
    docZh: z.string().optional(),
    docEn: z.string().optional(),
  })
  .superRefine((w, ctx) => {
    if (w.featured && w.coverRatio !== 1.5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['coverRatio'],
        message: '精选（2×2 大格）必须用横图 1.5',
      });
    }
    if (w.type !== 'video' && w.duration) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration'],
        message: '只有视频才允许填写时长',
      });
    }
    if (w.type === 'video' && w.duration) {
      if (!/^\d{1,2}:\d{2}$/.test(w.duration)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['duration'],
          message: '时长格式应为 mm:ss（如 04:12）',
        });
      }
    }
    if (w.tags.zh.length !== w.tagKeys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tagKeys'],
        message: 'tagKeys 数量必须与标签一致',
      });
    }
  });

export type WorkInput = z.input<typeof workSchema>;

export const recommendationSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1, '名称必填'),
  summary: localizedNonEmpty,
  type: z.enum(['open-source', 'software']),
  url: z.string().url('请填写合法 URL'),
  mark: z.string().min(1, '请填写字母标识').max(4),
  // 可选真实封面：站内 /media/ 路径或 http(s) 外链；留空即回落 mark 色块
  cover: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith('/media/') || /^https?:\/\//.test(v), {
      message: '封面需为站内 /media/ 路径或 http(s) 链接',
    }),
  dominantColor: z.string().optional(),
  tags: z.array(z.string()),
  createdAt: dateStr,
});

export type RecommendationInput = z.input<typeof recommendationSchema>;

export const profileSchema = z.object({
  name: localizedNonEmpty,
  title: localizedNonEmpty,
  bio: localized,
  avatar: z.string().min(1, '请上传或填写头像'),
  socials: z.array(z.object({ platform: z.string().min(1), url: z.string().min(1) })),
});

export type ProfileInput = z.input<typeof profileSchema>;

export const settingsSchema = z.object({
  defaultSeoTitle: z.string().min(1, '默认 SEO 标题必填'),
  defaultDescription: z.string(),
  footerNote: localized,
  contactEmail: z.union([z.literal(''), z.string().email('请填写合法邮箱')]),
  socials: z.array(z.object({ platform: z.string().min(1), url: z.string().min(1) })),
  // Hero 背景：留空即回落精选作品封面；填写时需为站内 /media/ 路径或 http(s) 外链
  heroImage: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith('/media/') || /^https?:\/\//.test(v), {
      message: 'Hero 背景需为站内 /media/ 路径或 http(s) 链接',
    }),
  heroColor: z.string().optional(),
});

export type SettingsInput = z.input<typeof settingsSchema>;
