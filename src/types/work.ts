import type { Localized } from './localized';

/** 封面只允许 3:2 与 2:3 两档，用字面量联合类型挡住第三种比例。 */
export type CoverRatio = 1.5 | 0.67;

export type WorkType = 'photography' | 'video';

/** 详情页相册中的单张图（数组顺序即展示顺序） */
export type GalleryImage = {
  src: string;
  /** 无障碍替代文本，双语可缺省 */
  alt?: Localized;
  dominantColor?: string;
};

/** 详情页视频素材：本地上传落盘或第三方平台 embed */
export type VideoAsset = {
  kind: 'local' | 'embed';
  /** local 为 /media/... 站内路径；embed 为 B站/YouTube 等 iframe 地址 */
  src: string;
  poster?: string;
  title?: Localized;
};

export type Work = {
  slug: string;
  title: Localized;
  summary: Localized;
  type: WorkType;
  cover: string;
  coverRatio: CoverRatio;
  tags: Localized<string[]>;
  /**
   * 与 tags 一一对应的语言无关 id（如 ["landscape","mountains"]）。
   * 筛选状态写进 URL 时只用它，保证中英切换后筛选不丢。
   */
  tagKeys: string[];
  createdAt: string;
  /**
   * Bento 的 2×2 大格。必须是横图（coverRatio: 1.5）：
   * 竖图当大格会被裁掉一半画面。
   */
  featured: boolean;
  order: number;
  /** 仅 type === 'video'，形如 "04:12"，显示在封面角标 */
  duration?: string;
  /** 构建时由 scripts/extract-dominant-colors.mjs 写入；缺失时回落到 bg-elevated */
  dominantColor?: string;
  /** 详情页多幅照片（结构化数据，空数组表示无额外图） */
  gallery: GalleryImage[];
  /** 详情页视频（仅结构化数据；type==='video' 时通常有值） */
  video?: VideoAsset;
};
