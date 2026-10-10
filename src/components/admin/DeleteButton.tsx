'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteWork, deleteRecommendation } from '@/lib/admin/actions';
import { btnDanger } from './styles';

type Props = {
  kind: 'work' | 'recommendation';
  slug: string;
  label?: string;
};

/** 删除按钮：调用对应 server action，成功后刷新列表（级联删 WorkDoc 由库层保证） */
export function DeleteButton({ kind, slug, label = '删除' }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={btnDanger}
      onClick={async () => {
        if (!window.confirm(`确认删除「${slug}」？此操作不可撤销。`)) return;
        const res = kind === 'work' ? await deleteWork(slug) : await deleteRecommendation(slug);
        if (res.ok) {
          toast.success('已删除');
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }}
    >
      {label}
    </button>
  );
}
