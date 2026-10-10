'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { btnGhost } from './styles';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={btnGhost}
      onClick={async () => {
        await signOut();
        router.push('/admin/login');
        router.refresh();
      }}
    >
      退出
    </button>
  );
}
