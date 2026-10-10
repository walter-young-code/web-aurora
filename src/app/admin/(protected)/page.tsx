import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getWorks } from '@/lib/content';
import { scanMediaFiles } from '@/lib/media';
import { btnGhost, btnPrimary, cardCls } from '@/components/admin/styles';

export const dynamic = 'force-dynamic';

const shortcuts = [
  { href: '/admin/works/new', label: '新建作品' },
  { href: '/admin/recommendations/new', label: '新建推荐' },
  { href: '/admin/media', label: '媒体库' },
  { href: '/admin/tags', label: '标签管理' },
  { href: '/admin/settings', label: '站点设置' },
  { href: '/admin/profile', label: '个人资料' },
];

export default async function AdminDashboardPage() {
  const [works, recCount, media] = await Promise.all([
    getWorks(),
    prisma.recommendation.count(),
    scanMediaFiles(),
  ]);

  const recent = [...works].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 5);

  const stats = [
    { label: '作品', value: works.length, href: '/admin/works' },
    { label: '推荐', value: recCount, href: '/admin/recommendations' },
    { label: '媒体文件', value: media.length, href: '/admin/media' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">仪表盘</h1>
        <Link href="/" target="_blank" className={btnGhost}>
          前台预览 ↗
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${cardCls} flex flex-col gap-1`}>
            <span className="text-sm text-text-secondary">{s.label}</span>
            <span className="font-display text-3xl text-text-primary">{s.value}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {shortcuts.map((sc) => (
          <Link key={sc.href} href={sc.href} className={btnGhost}>
            {sc.label}
          </Link>
        ))}
      </div>

      <div className={cardCls}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm text-text-secondary">最近作品</h2>
          <Link href="/admin/works" className={btnPrimary}>
            管理作品
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-text-muted">暂无作品</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {recent.map((w) => (
              <li key={w.slug} className="flex items-center justify-between py-2">
                <Link
                  href={`/admin/works/${w.slug}`}
                  className="truncate text-sm text-text-primary hover:text-accent"
                >
                  {w.title.zh}
                  <span className="ml-2 font-mono text-xs text-text-muted">{w.slug}</span>
                </Link>
                <span className="shrink-0 text-xs text-text-secondary">{w.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
