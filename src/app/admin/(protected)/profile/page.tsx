import { getProfile } from '@/lib/content';
import { ProfileForm } from '@/components/admin/ProfileForm';

export const dynamic = 'force-dynamic';

export default async function ProfileAdminPage() {
  const profile = await getProfile();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">个人资料</h1>
      <ProfileForm initial={profile} />
    </div>
  );
}
