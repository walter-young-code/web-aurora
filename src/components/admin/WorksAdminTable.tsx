'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { reorderWorks } from '@/lib/admin/actions';
import { btnGhost, btnPrimary, btnDanger, inputCls } from './styles';
import { DeleteButton } from './DeleteButton';

export type WorkRow = {
  slug: string;
  titleZh: string;
  type: 'photography' | 'video';
  featured: boolean;
  order: number;
  tagKeys: string[];
  tagsZh: string[];
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** 作品列表：搜索 + 类型/标签筛选 + 上下调序（保存顺序） */
export function WorksAdminTable({ initial }: { initial: WorkRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<WorkRow[]>(() =>
    [...initial].sort((a, b) => a.order - b.order),
  );
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [tag, setTag] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const tagOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) r.tagKeys.forEach((k, i) => map.set(k, r.tagsZh[i] ?? k));
    return [...map.entries()];
  }, [rows]);

  const visible = rows.filter((r) => {
    if (q && !`${r.titleZh}${r.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (type && r.type !== type) return false;
    if (tag && !r.tagKeys.includes(tag)) return false;
    return true;
  });

  function swap(slug: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.slug === slug);
    if (idx === -1) return;
    setRows((prev) => {
      const next = move(prev, idx, idx + dir).map((r, i) => ({ ...r, order: i }));
      return next;
    });
    setDirty(true);
  }

  async function saveOrder() {
    setSaving(true);
    const res = await reorderWorks(rows.map((r, i) => ({ slug: r.slug, order: i })));
    setSaving(false);
    if (res.ok) {
      toast.success('顺序已保存');
      setDirty(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-text-primary">作品</h1>
        <div className="flex gap-2">
          {dirty ? (
            <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveOrder()}>
              {saving ? '保存中…' : '保存顺序'}
            </button>
          ) : null}
          <Link href="/admin/works/new" className={btnPrimary}>
            新建作品
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputCls} max-w-xs`}
          placeholder="搜索标题或 slug"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={`${inputCls} max-w-[160px]`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">全部类型</option>
          <option value="photography">摄影</option>
          <option value="video">视频</option>
        </select>
        <select className={`${inputCls} max-w-[160px]`} value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">全部标签</option>
          {tagOptions.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-elevated text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-medium">顺序</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">标题</th>
              <th className="px-3 py-2 font-medium">类型</th>
              <th className="px-3 py-2 font-medium">精选</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const gi = rows.findIndex((x) => x.slug === r.slug);
              return (
                <tr key={r.slug} className="border-t border-line">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-text-muted">{r.order}</span>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={gi === 0}
                        onClick={() => swap(r.slug, -1)}
                        aria-label="上移"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={gi === rows.length - 1}
                        onClick={() => swap(r.slug, 1)}
                        aria-label="下移"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                  <td className="px-3 py-2 text-text-primary">{r.titleZh}</td>
                  <td className="px-3 py-2 text-text-secondary">{r.type}</td>
                  <td className="px-3 py-2">{r.featured ? '★' : ''}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Link href={`/admin/works/${r.slug}`} className={btnGhost}>
                        编辑
                      </Link>
                      <DeleteButton kind="work" slug={r.slug} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                  无匹配作品
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {dirty ? (
        <p className="text-xs text-text-muted">
          顺序已本地调整，点击「保存顺序」提交；
          <button type="button" className={`${btnDanger} ml-2`} onClick={() => {
            setRows([...initial].sort((a, b) => a.order - b.order));
            setDirty(false);
          }}>
            撤销
          </button>
        </p>
      ) : null}
    </>
  );
}
