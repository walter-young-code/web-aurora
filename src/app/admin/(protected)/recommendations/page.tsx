import Link from 'next/link';
import { getRecommendations } from '@/lib/content';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { CoverMark } from '@/components/media/RecommendationCard';
import { btnGhost, btnPrimary } from '@/components/admin/styles';

export const dynamic = 'force-dynamic';

export default async function RecommendationsAdminPage() {
  const items = await getRecommendations();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">推荐</h1>
        <Link href="/admin/recommendations/new" className={btnPrimary}>
          新建推荐
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-medium">封面</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">名称</th>
              <th className="px-3 py-2 font-medium">类型</th>
              <th className="px-3 py-2 font-medium">日期</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.slug} className="border-t border-line">
                <td className="px-3 py-2">
                  {r.cover?.startsWith('/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.cover}
                      alt=""
                      className="h-10 w-16 rounded-md border border-line object-cover"
                    />
                  ) : (
                    <CoverMark mark={r.mark} className="h-10 w-16 text-xs" />
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                <td className="px-3 py-2 text-text-primary">{r.title}</td>
                <td className="px-3 py-2 text-text-secondary">{r.type}</td>
                <td className="px-3 py-2 text-text-muted">{r.createdAt}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <Link href={`/admin/recommendations/${r.slug}`} className={btnGhost}>
                      编辑
                    </Link>
                    <DeleteButton kind="recommendation" slug={r.slug} />
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                  暂无推荐
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
