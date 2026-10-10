import { notFound } from 'next/navigation';
import { getWork } from '@/lib/content';
import { prisma } from '@/lib/db';
import { WorkForm, type WorkInitial } from '@/components/admin/WorkForm';

export const dynamic = 'force-dynamic';

export default async function EditWorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) notFound();

  // 编辑取「本语言」正文原样，缺失即空串（不能用 readWorkDoc 的回落逻辑）
  const [zh, en] = await Promise.all([
    prisma.workDoc.findFirst({ where: { work: { slug }, locale: 'zh' } }),
    prisma.workDoc.findFirst({ where: { work: { slug }, locale: 'en' } }),
  ]);

  const initial: WorkInitial = { work, docZh: zh?.body ?? '', docEn: en?.body ?? '' };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">
        编辑作品 <span className="font-mono text-base text-text-muted">{slug}</span>
      </h1>
      <WorkForm initial={initial} nextOrder={work.order} />
    </div>
  );
}
