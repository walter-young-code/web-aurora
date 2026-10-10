import type { Localized } from '@/types/localized';
import type {
  Work,
  WorkType,
  CoverRatio,
  GalleryImage,
  VideoAsset,
} from '@/types/work';
import type { Recommendation, RecommendationType } from '@/types/recommendation';
import type { Work as WorkRow, WorkDoc as WorkDocRow, Recommendation as RecRow } from '@/generated/prisma/client';

/**
 * repo 层：把 SQLite 里以 JSON 字符串存放的列（Localized 对象、字符串数组）与 app 类型互转，
 * 让 content.ts / actions.ts 的调用面保持与文件时代一致。
 */

export const jparse = <T>(raw: string): T => JSON.parse(raw) as T;
export const jstr = (value: unknown): string => JSON.stringify(value);

/** 与 DB 行结构对齐的最小类型（docs 可选，读取时 include 进来） */
type WorkRowWithDocs = WorkRow & { docs?: WorkDocRow[] };

export function rowToWork(row: WorkRowWithDocs): Work {
  const work: Work = {
    slug: row.slug,
    title: jparse<Localized>(row.title),
    summary: jparse<Localized>(row.summary),
    type: row.type as WorkType,
    cover: row.cover,
    coverRatio: row.coverRatio as CoverRatio,
    tags: jparse<Localized<string[]>>(row.tags),
    tagKeys: jparse<string[]>(row.tagKeys),
    createdAt: row.createdAt,
    featured: row.featured,
    order: row.order,
    gallery: row.gallery ? jparse<GalleryImage[]>(row.gallery) : [],
  };
  if (row.duration != null) work.duration = row.duration;
  if (row.dominantColor != null) work.dominantColor = row.dominantColor;
  if (row.video) work.video = jparse<VideoAsset>(row.video);
  return work;
}

export function rowToRecommendation(row: RecRow): Recommendation {
  const rec: Recommendation = {
    slug: row.slug,
    title: row.title,
    summary: jparse<Localized>(row.summary),
    type: row.type as RecommendationType,
    url: row.url,
    mark: row.mark,
    tags: jparse<string[]>(row.tags),
    createdAt: row.createdAt,
  };
  if (row.cover) rec.cover = row.cover;
  if (row.dominantColor) rec.dominantColor = row.dominantColor;
  return rec;
}
