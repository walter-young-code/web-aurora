'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Work, GalleryImage, VideoAsset } from '@/types/work';
import { slugify } from '@/lib/utils';
import { upsertWork } from '@/lib/admin/actions';
import { btnGhost, btnPrimary, cardCls, inputCls, labelCls } from './styles';
import { LocalizedField } from './LocalizedField';
import { MediaUpload } from './MediaUpload';
import { MdxTabsEditor } from './MdxTabsEditor';
import { GalleryEditor } from './GalleryEditor';
import { VideoEditor } from './VideoEditor';

const today = () => new Date().toISOString().slice(0, 10);

const formSchema = z.object({
  slug: z.string().min(2, 'slug 太短'),
  titleZh: z.string().min(1, '中文标题必填'),
  titleEn: z.string().min(1, 'English title required'),
  summaryZh: z.string().min(1, '中文简介必填'),
  summaryEn: z.string().min(1, 'English summary required'),
  type: z.enum(['photography', 'video']),
  cover: z.string().min(1, '请上传或填写封面'),
  coverRatio: z.coerce.number().refine((v) => v === 1.5 || v === 0.67, '封面比例不合法'),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 yyyy-MM-dd'),
  featured: z.boolean(),
  order: z.coerce.number().int(),
  duration: z.string().optional(),
  dominantColor: z.string().optional(),
  tagsZh: z.string(),
  tagsEn: z.string(),
  docZh: z.string(),
  docEn: z.string(),
});

type FormValues = z.input<typeof formSchema>;

export type WorkInitial = { work: Work; docZh: string; docEn: string };

type Props = {
  /** 编辑时传入既有作品；新建传 null */
  initial: WorkInitial | null;
  /** 新建时的默认 order（列表末尾 +1） */
  nextOrder: number;
};

function toDefaults({ initial, nextOrder }: Props): FormValues {
  const w = initial?.work;
  return {
    slug: w?.slug ?? '',
    titleZh: w?.title.zh ?? '',
    titleEn: w?.title.en ?? '',
    summaryZh: w?.summary.zh ?? '',
    summaryEn: w?.summary.en ?? '',
    type: w?.type ?? 'photography',
    cover: w?.cover ?? '',
    coverRatio: w?.coverRatio ?? 1.5,
    createdAt: w?.createdAt ?? today(),
    featured: w?.featured ?? false,
    order: w?.order ?? nextOrder,
    duration: w?.duration ?? '',
    dominantColor: w?.dominantColor ?? '',
    tagsZh: w?.tags.zh.join(', ') ?? '',
    tagsEn: w?.tags.en.join(', ') ?? '',
    docZh: initial?.docZh ?? '',
    docEn: initial?.docEn ?? '',
  };
}

const splitTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function WorkForm(props: Props) {
  const { initial } = props;
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(props),
  });

  const type = watch('type');
  const cover = watch('cover');
  const dominantColor = watch('dominantColor') ?? '';
  const dir = `works/${watch('slug') || 'draft'}`;
  // 相册/视频为结构化数据，用局部 state 管理（复杂对象不走 RHF）
  const [gallery, setGallery] = useState<GalleryImage[]>(initial?.work.gallery ?? []);
  const [video, setVideo] = useState<VideoAsset | null>(initial?.work.video ?? null);

  async function onSubmit(values: FormValues) {
    const enTags = splitTags(values.tagsEn);
    const res = await upsertWork({
      slug: values.slug,
      title: { zh: values.titleZh, en: values.titleEn },
      summary: { zh: values.summaryZh, en: values.summaryEn },
      type: values.type,
      cover: values.cover,
      coverRatio: values.coverRatio === 0.67 ? 0.67 : 1.5,
      tags: { zh: splitTags(values.tagsZh), en: enTags },
      tagKeys: enTags.map(slugify),
      createdAt: values.createdAt,
      featured: values.featured,
      order: values.order,
      duration: values.type === 'video' && values.duration ? values.duration : undefined,
      dominantColor: values.dominantColor || undefined,
      gallery,
      video: values.type === 'video' && video && video.src ? video : null,
      docZh: values.docZh || undefined,
      docEn: values.docEn || undefined,
    });
    if (res.ok) {
      toast.success(initial ? '已保存' : '已创建');
      router.push('/admin/works');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className={cardCls}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="slug">
              Slug（URL 标识）
            </label>
            <input id="slug" className={inputCls} {...register('slug')} />
            {errors.slug ? <p className="mt-1 text-xs text-danger">{errors.slug.message}</p> : null}
          </div>
          <div>
            <label className={labelCls} htmlFor="createdAt">
              日期（yyyy-MM-dd）
            </label>
            <input id="createdAt" className={inputCls} {...register('createdAt')} />
            {errors.createdAt ? (
              <p className="mt-1 text-xs text-danger">{errors.createdAt.message}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-4`}>
        <LocalizedField
          label="标题"
          registerZh={register('titleZh')}
          registerEn={register('titleEn')}
          errorZh={errors.titleZh?.message}
          errorEn={errors.titleEn?.message}
        />
        <LocalizedField
          label="简介"
          registerZh={register('summaryZh')}
          registerEn={register('summaryEn')}
          errorZh={errors.summaryZh?.message}
          errorEn={errors.summaryEn?.message}
        />
      </div>

      <div className={`${cardCls} grid gap-4 sm:grid-cols-2`}>
        <div>
          <label className={labelCls} htmlFor="type">
            类型
          </label>
          <select id="type" className={inputCls} {...register('type')}>
            <option value="photography">摄影 photography</option>
            <option value="video">视频 video</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="coverRatio">
            封面比例
          </label>
          <select id="coverRatio" className={inputCls} {...register('coverRatio')}>
            <option value={1.5}>横图 3:2（1.5）</option>
            <option value={0.67}>竖图 2:3（0.67）</option>
          </select>
        </div>
        {type === 'video' ? (
          <div>
            <label className={labelCls} htmlFor="duration">
              时长（mm:ss）
            </label>
            <input id="duration" className={inputCls} placeholder="04:12" {...register('duration')} />
          </div>
        ) : null}
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" className="h-4 w-4 accent-accent" {...register('featured')} />
            精选（2×2 大格，需横图）
          </label>
        </div>
        <div>
          <label className={labelCls} htmlFor="order">
            排序（order）
          </label>
          <input id="order" type="number" className={inputCls} {...register('order')} />
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-4`}>
        <div>
          <span className={labelCls}>封面图</span>
          <MediaUpload
            dir={dir}
            value={cover}
            onChange={(url) => setValue('cover', url, { shouldDirty: true })}
            onColor={(hex) => setValue('dominantColor', hex, { shouldDirty: true })}
          />
          {errors.cover ? <p className="mt-1 text-xs text-danger">{errors.cover.message}</p> : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="tagsZh">
              标签（中文，逗号分隔）
            </label>
            <input id="tagsZh" className={inputCls} placeholder="风光, 山" {...register('tagsZh')} />
          </div>
          <div>
            <label className={labelCls} htmlFor="tagsEn">
              标签（English, comma separated）
            </label>
            <input id="tagsEn" className={inputCls} placeholder="Landscape, Mountains" {...register('tagsEn')} />
          </div>
        </div>
        <div className="text-xs text-text-muted">
          tagKeys 由英文标签自动生成：{splitTags(watch('tagsEn')).map(slugify).join(', ') || '—'}
          {dominantColor ? (
            <span className="ml-3 inline-flex items-center gap-1">
              主色
              <span
                className="inline-block h-3 w-3 rounded-sm border border-line align-middle"
                style={{ backgroundColor: dominantColor }}
              />
              {dominantColor}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-3`}>
        <span className={labelCls}>相册（详情页多幅照片）</span>
        <GalleryEditor dir={dir} value={gallery} onChange={setGallery} />
      </div>

      {type === 'video' ? (
        <div className={`${cardCls} flex flex-col gap-3`}>
          <span className={labelCls}>视频</span>
          <VideoEditor dir={dir} value={video} onChange={setVideo} />
        </div>
      ) : null}

      <div className={cardCls}>
        <span className={labelCls}>正文（MDX，双语）</span>
        <MdxTabsEditor
          valueZh={watch('docZh')}
          valueEn={watch('docEn')}
          onChangeZh={(v) => setValue('docZh', v, { shouldDirty: true })}
          onChangeEn={(v) => setValue('docEn', v, { shouldDirty: true })}
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : '保存'}
        </button>
        <button type="button" className={btnGhost} onClick={() => router.push('/admin/works')}>
          取消
        </button>
      </div>
    </form>
  );
}
