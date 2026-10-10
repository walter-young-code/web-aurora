import type { Localized } from './localized';

export type RecommendationType = 'open-source' | 'software';

export type Recommendation = {
  slug: string;
  /** 专有名词保持原文，不做双语；推荐理由才是 Localized */
  title: string;
  summary: Localized;
  type: RecommendationType;
  url: string;
  /** 色块封面用的字母标识（cover-mark），无封面图时回落展示 */
  mark: string;
  /** 可选真实封面图（站内 /media/ 路径），缺省时前台用 mark 色块 */
  cover?: string;
  /** 上传封面时算出的主色，图片到位前铺底 */
  dominantColor?: string;
  tags: string[];
  createdAt: string;
};
