'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Recommendation } from '@/types/recommendation';
import { upsertRecommendation } from '@/lib/admin/actions';
import { btnGhost, btnPrimary, cardCls, inputCls, labelCls } from './styles';
import { LocalizedField } from './LocalizedField';
import { MediaUpload } from './MediaUpload';

const today = () => new Date().toISOString().slice(0, 10);

const formSchema = z.object({
  slug: z.string().min(2, 'slug 太短'),
  title: z.string().min(1, '名称必填'),
  summaryZh: z.string().min(1, '中文理由必填'),
  summaryEn: z.string().min(1, 'English reason required'),
  type: z.enum(['open-source', 'software']),
  url: z.string().min(1, '请填写 URL'),
  mark: z.string().min(1, '请填写字母标识').max(4),
  cover: z.string().optional(),
  dominantColor: z.string().optional(),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 yyyy-MM-dd'),
  tags: z.string(),
});

type FormValues = z.input<typeof formSchema>;

const splitTags = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function RecommendationForm({ initial }: { initial: Recommendation | null }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: initial?.slug ?? '',
      title: initial?.title ?? '',
      summaryZh: initial?.summary.zh ?? '',
      summaryEn: initial?.summary.en ?? '',
      type: initial?.type ?? 'open-source',
      url: initial?.url ?? '',
      mark: initial?.mark ?? '',
      cover: initial?.cover ?? '',
      dominantColor: initial?.dominantColor ?? '',
      createdAt: initial?.createdAt ?? today(),
      tags: initial?.tags.join(', ') ?? '',
    },
  });

  const cover = watch('cover') ?? '';
  const dir = `recommendations/${watch('slug') || 'draft'}`;

  async function onSubmit(values: FormValues) {
    const res = await upsertRecommendation({
      slug: values.slug,
      title: values.title,
      summary: { zh: values.summaryZh, en: values.summaryEn },
      type: values.type,
      url: values.url,
      mark: values.mark,
      cover: values.cover?.trim() || undefined,
      dominantColor: values.cover?.trim() ? values.dominantColor || undefined : undefined,
      tags: splitTags(values.tags),
      createdAt: values.createdAt,
    });
    if (res.ok) {
      toast.success(initial ? '已保存' : '已创建');
      router.push('/admin/recommendations');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className={`${cardCls} grid gap-4 sm:grid-cols-2`}>
        <div>
          <label className={labelCls} htmlFor="slug">
            Slug
          </label>
          <input id="slug" className={inputCls} {...register('slug')} />
          {errors.slug ? <p className="mt-1 text-xs text-danger">{errors.slug.message}</p> : null}
        </div>
        <div>
          <label className={labelCls} htmlFor="title">
            名称（专有名词，不双语）
          </label>
          <input id="title" className={inputCls} {...register('title')} />
          {errors.title ? <p className="mt-1 text-xs text-danger">{errors.title.message}</p> : null}
        </div>
        <div>
          <label className={labelCls} htmlFor="type">
            类型
          </label>
          <select id="type" className={inputCls} {...register('type')}>
            <option value="open-source">开源 open-source</option>
            <option value="software">软件 software</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="mark">
            字母标识（无封面时的色块回落）
          </label>
          <input id="mark" className={inputCls} placeholder="NI" {...register('mark')} />
          {errors.mark ? <p className="mt-1 text-xs text-danger">{errors.mark.message}</p> : null}
        </div>
        <div>
          <label className={labelCls} htmlFor="url">
            链接 URL
          </label>
          <input id="url" className={inputCls} {...register('url')} />
          {errors.url ? <p className="mt-1 text-xs text-danger">{errors.url.message}</p> : null}
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

      <div className={`${cardCls} flex flex-col gap-4`}>
        <div>
          <span className={labelCls}>封面图（可选）</span>
          <MediaUpload
            dir={dir}
            value={cover}
            onChange={(url) => setValue('cover', url, { shouldDirty: true })}
            onColor={(hex) => setValue('dominantColor', hex, { shouldDirty: true })}
          />
          <p className="mt-1 text-xs text-text-muted">
            上传后卡片展示真实封面；留空则用字母标识的色块封面。
          </p>
          {errors.cover ? <p className="mt-1 text-xs text-danger">{errors.cover.message}</p> : null}
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-4`}>
        <LocalizedField
          label="推荐理由"
          registerZh={register('summaryZh')}
          registerEn={register('summaryEn')}
          errorZh={errors.summaryZh?.message}
          errorEn={errors.summaryEn?.message}
        />
        <div>
          <label className={labelCls} htmlFor="tags">
            标签（逗号分隔）
          </label>
          <input id="tags" className={inputCls} placeholder="Next.js, i18n" {...register('tags')} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : '保存'}
        </button>
        <button type="button" className={btnGhost} onClick={() => router.push('/admin/recommendations')}>
          取消
        </button>
      </div>
    </form>
  );
}
