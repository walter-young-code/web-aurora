'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteMediaAction, uploadMediaAction, type MediaListItem } from '@/lib/admin/actions';
import { btnGhost, btnDanger, cardCls } from './styles';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 媒体库：网格展示所有素材，复制 URL、上传新文件、删除未被引用项 */
export function MediaLibrary({ initial }: { initial: MediaListItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('已复制 URL');
    } catch {
      toast.error('复制失败，请手动选择');
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('dir', 'misc');
    const res = await uploadMediaAction(fd);
    setUploading(false);
    if (res.ok) {
      toast.success('上传成功');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(url: string) {
    if (!window.confirm(`确认删除 ${url}？不可撤销。`)) return;
    const res = await deleteMediaAction(url);
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.url !== url));
      toast.success('已删除');
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btnGhost}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '上传中…' : '上传文件'}
        </button>
        <span className="text-xs text-text-muted">上传到 /media/misc，之后可在表单中引用</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">媒体库为空</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.url} className={`${cardCls} flex flex-col gap-2 p-3`}>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-bg">
                {it.kind === 'video' ? (
                  <video src={it.url} muted className="h-full w-full object-cover" />
                ) : it.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-content-center text-xs text-text-muted">
                    未知类型
                  </div>
                )}
              </div>
              <p className="truncate font-mono text-xs text-text-secondary" title={it.url}>
                {it.url.split('/').pop()}
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{formatSize(it.size)}</span>
                {it.used ? (
                  <span className="text-accent">使用中</span>
                ) : (
                  <span>未引用</span>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnGhost} onClick={() => void copy(it.url)}>
                  复制 URL
                </button>
                <button
                  type="button"
                  className={`${btnDanger} disabled:opacity-40`}
                  disabled={it.used}
                  title={it.used ? '正被内容引用，无法删除' : undefined}
                  onClick={() => void handleDelete(it.url)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
