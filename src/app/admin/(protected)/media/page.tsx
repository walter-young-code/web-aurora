import { listMediaAction } from '@/lib/admin/actions';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const dynamic = 'force-dynamic';

export default async function MediaAdminPage() {
  const items = await listMediaAction();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">媒体库</h1>
      <MediaLibrary initial={items} />
    </div>
  );
}
