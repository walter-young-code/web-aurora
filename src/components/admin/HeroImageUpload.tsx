'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadHeroImageAction } from '@/lib/admin/actions';
import { btnGhost, btnDanger, inputCls } from './styles';

type Props = {
  value: string;
  color?: string;
  onChange: (url: string, color?: string) => void;
};

/** 与后端 uploadHeroImage 的 HERO_IMAGE 约束保持一致的展示文案 */
const REQUIREMENTS = [
  '方向：横图，宽高比 ≥ 1.5（推荐 16:9 或更宽）',
  '尺寸：宽度 ≥ 1600px（铺满首屏不糊）',
  '体积：单张 ≤ 8MB',
  '格式：JPG / PNG / WebP / AVIF（不支持 GIF、视频）',
];

/**
 * Hero 背景上传控件：展示格式要求 → 选文件调用 uploadHeroImageAction（服务端强校验）→
 * 成功后回写 URL + 主色并预览；留空即回落精选作品封面。也支持直接粘贴已有站内路径。
 */
export function HeroImageUpload({ value, color, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadHeroImageAction(fd);
    setUploading(false);
    if (res.ok) {
      onChange(res.url, res.dominantColor);
      toast.success('Hero 背景已上传，记得点击保存');
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 rounded-md border border-line bg-bg px-3 py-2 text-xs text-text-secondary">
        {REQUIREMENTS.map((line) => (
          <li key={line}>· {line}</li>
        ))}
        <li className="mt-1 text-text-muted">留空则自动使用「精选作品」的封面作为背景。</li>
      </ul>

      <div className="flex gap-2">
        <input
          className={inputCls}
          value={value}
          placeholder="/media/hero/….jpg（留空回落作品封面）"
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={btnGhost}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? '校验上传中…' : '上传'}
        </button>
        {value ? (
          <button type="button" className={btnDanger} onClick={() => onChange('', undefined)}>
            清除
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {value ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Hero 背景预览"
            className="h-28 w-48 rounded-md border border-line object-cover"
          />
          {color ? (
            <span className="flex items-center gap-2 text-xs text-text-secondary">
              主色
              <span
                className="inline-block h-4 w-4 rounded border border-line"
                style={{ backgroundColor: color }}
              />
              {color}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
