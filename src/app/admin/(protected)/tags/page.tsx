import { getWorks } from '@/lib/content';
import { TagManager, type TagRow } from '@/components/admin/TagManager';

export const dynamic = 'force-dynamic';

export default async function TagsAdminPage() {
  const works = await getWorks();
  const map = new Map<string, TagRow>();
  for (const w of works) {
    w.tagKeys.forEach((key, i) => {
      const row = map.get(key) ?? { key, zh: w.tags.zh[i] ?? key, en: w.tags.en[i] ?? key, count: 0 };
      row.count += 1;
      map.set(key, row);
    });
  }
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">标签管理</h1>
      <TagManager initial={[...map.values()]} />
    </div>
  );
}
