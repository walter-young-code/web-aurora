import { getWorks } from '@/lib/content';
import { WorksAdminTable, type WorkRow } from '@/components/admin/WorksAdminTable';

export const dynamic = 'force-dynamic';

export default async function WorksAdminPage() {
  const works = await getWorks();
  const rows: WorkRow[] = works.map((w) => ({
    slug: w.slug,
    titleZh: w.title.zh,
    type: w.type,
    featured: w.featured,
    order: w.order,
    tagKeys: w.tagKeys,
    tagsZh: w.tags.zh,
  }));

  return (
    <div className="flex flex-col gap-5">
      <WorksAdminTable initial={rows} />
    </div>
  );
}
