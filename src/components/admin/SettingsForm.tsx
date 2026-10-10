'use client';

import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Settings } from '@/lib/content';
import { upsertSettings } from '@/lib/admin/actions';
import { btnGhost, btnPrimary, btnDanger, cardCls, inputCls, labelCls } from './styles';
import { HeroImageUpload } from './HeroImageUpload';

const formSchema = z.object({
  defaultSeoTitle: z.string().min(1, '默认 SEO 标题必填'),
  defaultDescription: z.string(),
  footerZh: z.string(),
  footerEn: z.string(),
  contactEmail: z.union([z.literal(''), z.string().email('请填写合法邮箱')]),
  socials: z.array(z.object({ platform: z.string().min(1), url: z.string().min(1) })),
  heroImage: z.string(),
  heroColor: z.string(),
});

type FormValues = z.input<typeof formSchema>;

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultSeoTitle: initial.defaultSeoTitle,
      defaultDescription: initial.defaultDescription,
      footerZh: initial.footerNote.zh,
      footerEn: initial.footerNote.en,
      contactEmail: initial.contactEmail,
      socials: initial.socials,
      heroImage: initial.heroImage ?? '',
      heroColor: initial.heroColor ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'socials' });
  const heroImage = watch('heroImage');
  const heroColor = watch('heroColor');

  async function onSubmit(values: FormValues) {
    const res = await upsertSettings({
      defaultSeoTitle: values.defaultSeoTitle,
      defaultDescription: values.defaultDescription,
      footerNote: { zh: values.footerZh, en: values.footerEn },
      contactEmail: values.contactEmail,
      socials: values.socials,
      heroImage: values.heroImage.trim() || undefined,
      heroColor: values.heroColor.trim() || undefined,
    });
    if (res.ok) {
      toast.success('已保存');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className={`${cardCls} flex flex-col gap-4`}>
        <div>
          <label className={labelCls} htmlFor="defaultSeoTitle">
            默认 SEO 标题
          </label>
          <input id="defaultSeoTitle" className={inputCls} {...register('defaultSeoTitle')} />
          {errors.defaultSeoTitle ? (
            <p className="mt-1 text-xs text-danger">{errors.defaultSeoTitle.message}</p>
          ) : null}
        </div>
        <div>
          <label className={labelCls} htmlFor="defaultDescription">
            默认 SEO 描述
          </label>
          <textarea id="defaultDescription" className={inputCls} rows={2} {...register('defaultDescription')} />
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-4`}>
        <span className={labelCls}>页脚说明</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <textarea
            className="min-h-[80px] w-full rounded-md border border-line bg-bg p-3 text-sm text-text-primary outline-none focus:border-accent"
            placeholder="中文"
            {...register('footerZh')}
          />
          <textarea
            className="min-h-[80px] w-full rounded-md border border-line bg-bg p-3 text-sm text-text-primary outline-none focus:border-accent"
            placeholder="English"
            {...register('footerEn')}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="contactEmail">
            联系邮箱（可留空）
          </label>
          <input id="contactEmail" className={inputCls} placeholder="hello@example.com" {...register('contactEmail')} />
          {errors.contactEmail ? (
            <p className="mt-1 text-xs text-danger">{errors.contactEmail.message}</p>
          ) : null}
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-3`}>
        <span className={labelCls}>首页 Hero 背景图</span>
        <HeroImageUpload
          value={heroImage}
          color={heroColor}
          onChange={(url, color) => {
            setValue('heroImage', url, { shouldDirty: true });
            setValue('heroColor', color ?? '', { shouldDirty: true });
          }}
        />
        {errors.heroImage ? (
          <p className="text-xs text-danger">{errors.heroImage.message}</p>
        ) : null}
      </div>

      <div className={`${cardCls} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <span className={labelCls}>页脚社交链接</span>
          <button type="button" className={btnGhost} onClick={() => append({ platform: '', url: '' })}>
            新增
          </button>
        </div>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <input className={inputCls} placeholder="平台 GitHub" {...register(`socials.${i}.platform` as const)} />
            <input className={inputCls} placeholder="https://github.com/…" {...register(`socials.${i}.url` as const)} />
            <button type="button" className={btnDanger} onClick={() => remove(i)}>
              删除
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  );
}
