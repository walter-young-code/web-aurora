import { getWorks } from '@/lib/content';
import { WorkForm } from '@/components/admin/WorkForm';

export const dynamic = 'force-dynamic';

export default async function NewWorkPage() {
  const works = await getWorks();
  const nextOrder = works.reduce((max, w) => Math.max(max, w.order), 0) + 1;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">新建作品</h1>
      <WorkForm initial={null} nextOrder={nextOrder} />
    </div>
  );
}
