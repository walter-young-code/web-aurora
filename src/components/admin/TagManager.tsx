'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { renameTagAction, mergeTagsAction, deleteTagAction } from '@/lib/admin/actions';
import { btnGhost, btnDanger, btnPrimary, inputCls } from './styles';

export type TagRow = { key: string; zh: string; en: string; count: number };

/** 标签管理：重命名（全量同步）、合并到另一标签、删除 */
export function TagManager({ initial }: { initial: TagRow[] }) {
  const router = useRouter();
  const [rows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ zh: '', en: '' });
  const [mergeTarget, setMergeTarget] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      toast.success(msg);
      router.refresh();
    } else {
      toast.error(res.error ?? '操作失败');
    }
  }

  function startEdit(row: TagRow) {
    setEditing(row.key);
    setDraft({ zh: row.zh, en: row.en });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">暂无标签。在作品表单里添加标签后即可在此管理。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-bg-elevated text-text-secondary">
          <tr>
            <th className="px-3 py-2 font-medium">中文</th>
            <th className="px-3 py-2 font-medium">English</th>
            <th className="px-3 py-2 font-medium">key</th>
            <th className="px-3 py-2 font-medium">引用</th>
            <th className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-line align-top">
              <td className="px-3 py-2 text-text-primary">
                {editing === row.key ? (
                  <input
                    className={inputCls}
                    value={draft.zh}
                    onChange={(e) => setDraft((d) => ({ ...d, zh: e.target.value }))}
                  />
                ) : (
                  row.zh
                )}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {editing === row.key ? (
                  <input
                    className={inputCls}
                    value={draft.en}
                    onChange={(e) => setDraft((d) => ({ ...d, en: e.target.value }))}
                  />
                ) : (
                  row.en
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-muted">{row.key}</td>
              <td className="px-3 py-2 text-text-secondary">{row.count}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {editing === row.key ? (
                    <>
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={busy || !draft.en.trim() || !draft.zh.trim()}
                        onClick={() =>
                          void run(
                            () => renameTagAction(row.key, draft.zh.trim(), draft.en.trim()),
                            '已重命名',
                          ).then(() => setEditing(null))
                        }
                      >
                        保存
                      </button>
                      <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className={btnGhost} onClick={() => startEdit(row)}>
                        重命名
                      </button>
                      <select
                        className={`${inputCls} w-32`}
                        value={mergeTarget[row.key] ?? ''}
                        onChange={(e) => setMergeTarget((m) => ({ ...m, [row.key]: e.target.value }))}
                      >
                        <option value="">合并到…</option>
                        {rows
                          .filter((r) => r.key !== row.key)
                          .map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.zh}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={!mergeTarget[row.key] || busy}
                        onClick={() =>
                          void run(
                            () => mergeTagsAction(row.key, mergeTarget[row.key]),
                            '已合并',
                          )
                        }
                      >
                        执行合并
                      </button>
                      <button
                        type="button"
                        className={btnDanger}
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`删除标签「${row.zh}」将从所有作品移除它，确认？`)) return;
                          void run(() => deleteTagAction(row.key), '已删除');
                        }}
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
