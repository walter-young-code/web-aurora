import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { LogoutButton } from '@/components/admin/LogoutButton';

/**
 * 后台受保护区：全程服务端会话校验。
 * 未登录直接 redirect 到 /admin/login。读 headers/cookie ⇒ 强制动态，不能预渲染。
 */
export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: '仪表盘' },
  { href: '/admin/works', label: '作品' },
  { href: '/admin/recommendations', label: '推荐' },
  { href: '/admin/media', label: '媒体库' },
  { href: '/admin/tags', label: '标签' },
  { href: '/admin/settings', label: '站点设置' },
  { href: '/admin/profile', label: '个人资料' },
];

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session?.user) redirect('/admin/login');

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-line bg-bg-elevated p-4">
        <Link href="/admin" className="mb-4 font-display text-lg text-text-primary">
          Aurora 后台
        </Link>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto flex items-center justify-between gap-2 pt-6">
          <span className="truncate text-xs text-text-muted">{session.user.email}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
