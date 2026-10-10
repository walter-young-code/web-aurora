import { getSettings } from '@/lib/content';
import { SettingsForm } from '@/components/admin/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsAdminPage() {
  const settings = await getSettings();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">站点设置</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
