'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadMediaAction } from '@/lib/admin/actions';
import type { GalleryImage } from '@/types/work';
import { btnGhost, btnDanger, inputCls } from './styles';

type Props = {
  dir: string;
  value: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
};

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * 相册编辑器：批量上传多图、缩略图网格、上移/下移调序、逐项删除，
 * 每张可填中英 alt；上传即带回主色调。顺序即前台展示顺序。
 */
export function GalleryEditor({ dir, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const added: GalleryImage[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('dir', dir);
      const res = await uploadMediaAction(fd);
      if (res.ok) added.push({ src: res.url, dominantColor: res.dominantColor });
      else toast.error(`${file.name}：${res.error}`);
    }
    setUploading(false);
    if (added.length) {
      onChange([...value, ...added]);
      toast.success(`已添加 ${added.length} 张`);
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  function patch(index: number, partial: Partial<GalleryImage>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...partial } : it)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnGhost}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '上传中…' : '添加图片'}
        </button>
        <span className="text-xs text-text-muted">可多选；上传后按添加顺序排列，可再调整</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
          }}
        />
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-text-muted">暂无相册图片</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {value.map((item, i) => (
            <li key={item.src} className="flex gap-3 rounded-md border border-line bg-bg p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt=""
                className="h-20 w-28 shrink-0 rounded-md border border-line object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  className={inputCls}
                  value={item.alt?.zh ?? ''}
                  placeholder="中文替代文本（可留空）"
                  onChange={(e) => patch(i, { alt: { zh: e.target.value, en: item.alt?.en ?? '' } })}
                />
                <input
                  className={inputCls}
                  value={item.alt?.en ?? ''}
                  placeholder="English alt (optional)"
                  onChange={(e) => patch(i, { alt: { zh: item.alt?.zh ?? '', en: e.target.value } })}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  className={btnGhost}
                  disabled={i === 0}
                  onClick={() => onChange(move(value, i, i - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={i === value.length - 1}
                  onClick={() => onChange(move(value, i, i + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={btnDanger}
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
