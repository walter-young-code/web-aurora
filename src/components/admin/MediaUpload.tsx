'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadMediaAction } from '@/lib/admin/actions';
import { btnGhost, inputCls } from './styles';

type Props = {
  /** 相对落盘子目录，如 works/<slug> */
  dir: string;
  value: string;
  onChange: (url: string) => void;
  /** 图片主色调回调（封面用） */
  onColor?: (hex: string) => void;
  /** 上传类型：图片（默认）或视频 */
  kind?: 'image' | 'video';
};

/**
 * 媒体上传控件：选择文件 → 调用 uploadMediaAction 落盘 → 回显 URL + 预览。
 * kind='video' 时接受视频文件并渲染 <video> 预览（不算主色）。
 * 也允许直接粘贴已有 URL（复用旧图/外链或平台 embed 地址）。
 */
export function MediaUpload({ dir, value, onChange, onColor, kind = 'image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const isVideo = kind === 'video';

  async function handleFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('dir', dir);
    const res = await uploadMediaAction(fd);
    setUploading(false);
    if (res.ok) {
      onChange(res.url);
      if (res.dominantColor && onColor) onColor(res.dominantColor);
      toast.success('上传成功');
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={inputCls}
          value={value}
          placeholder={isVideo ? '/media/works/…/film.mp4 或 https://…' : '/media/works/…/cover.jpg'}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={btnGhost}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '上传中…' : '上传'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {value ? (
        isVideo ? (
          <video
            src={value}
            controls
            preload="metadata"
            className="h-24 w-40 rounded-md border border-line object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="预览"
            className="h-24 w-40 rounded-md border border-line object-cover"
          />
        )
      ) : null}
    </div>
  );
}
