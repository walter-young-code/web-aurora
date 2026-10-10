'use client';

import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Profile } from '@/lib/content';
import { upsertProfile } from '@/lib/admin/actions';
import { btnGhost, btnPrimary, btnDanger, cardCls, inputCls, labelCls } from './styles';
import { LocalizedField } from './LocalizedField';
import { MediaUpload } from './MediaUpload';

const formSchema = z.object({
  nameZh: z.string().min(1, '中文姓名必填'),
  nameEn: z.string().min(1, 'English name required'),
  titleZh: z.string().min(1, '中文头衔必填'),
  titleEn: z.string().min(1, 'English title required'),
  bioZh: z.string(),
  bioEn: z.string(),
  avatar: z.string().min(1, '请上传或填写头像'),
  socials: z.array(z.object({ platform: z.string().min(1), url: z.string().min(1) })),
});

type FormValues = z.input<typeof formSchema>;

export function ProfileForm({ initial }: { initial: Profile }) {
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
      nameZh: initial.name.zh,
      nameEn: initial.name.en,
      titleZh: initial.title.zh,
      titleEn: initial.title.en,
      bioZh: initial.bio.zh,
      bioEn: initial.bio.en,
      avatar: initial.avatar,
      socials: initial.socials,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'socials' });
  const avatar = watch('avatar');

  async function onSubmit(values: FormValues) {
    const res = await upsertProfile({
      name: { zh: values.nameZh, en: values.nameEn },
      title: { zh: values.titleZh, en: values.titleEn },
      bio: { zh: values.bioZh, en: values.bioEn },
      avatar: values.avatar,
      socials: values.socials,
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
        <LocalizedField
          label="姓名"
          registerZh={register('nameZh')}
          registerEn={register('nameEn')}
          errorZh={errors.nameZh?.message}
          errorEn={errors.nameEn?.message}
        />
        <LocalizedField
          label="头衔"
          registerZh={register('titleZh')}
          registerEn={register('titleEn')}
          errorZh={errors.titleZh?.message}
          errorEn={errors.titleEn?.message}
        />
        <div>
          <span className={labelCls}>简介</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <textarea
              className="min-h-[120px] w-full rounded-md border border-line bg-bg p-3 text-sm text-text-primary outline-none focus:border-accent"
              {...register('bioZh')}
            />
            <textarea
              className="min-h-[120px] w-full rounded-md border border-line bg-bg p-3 text-sm text-text-primary outline-none focus:border-accent"
              {...register('bioEn')}
            />
          </div>
        </div>
      </div>

      <div className={`${cardCls} flex flex-col gap-3`}>
        <span className={labelCls}>头像</span>
        <MediaUpload
          dir="profile"
          value={avatar}
          onChange={(url) => setValue('avatar', url, { shouldDirty: true })}
        />
        {errors.avatar ? <p className="text-xs text-danger">{errors.avatar.message}</p> : null}
      </div>

      <div className={`${cardCls} flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <span className={labelCls}>社交链接</span>
          <button
            type="button"
            className={btnGhost}
            onClick={() => append({ platform: '', url: '' })}
          >
            新增
          </button>
        </div>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-center gap-2">
            <input
              className={inputCls}
              placeholder="平台 GitHub"
              {...register(`socials.${i}.platform` as const)}
            />
            <input
              className={inputCls}
              placeholder="https://github.com/…"
              {...register(`socials.${i}.url` as const)}
            />
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
