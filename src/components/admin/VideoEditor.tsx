'use client';

import { useState } from 'react';
import type { VideoAsset } from '@/types/work';
import { btnGhost, btnDanger, inputCls, labelCls } from './styles';
import { MediaUpload } from './MediaUpload';

type Props = {
  dir: string;
  value: VideoAsset | null;
  onChange: (next: VideoAsset | null) => void;
};

/** 尽力把常见分享链接转成可 iframe 嵌入的 embed 地址；无法识别则原样返回 */
function toEmbedUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return s;
  const yt =
    s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/) ??
    s.match(/youtube\.com\/embed\/([\w-]{11})/);
  if (yt) return `//www.youtube.com/embed/${yt[1]}`;
  const bv = s.match(/bilibili\.com\/video\/(BV[\w]+)/i);
  if (bv) return `//player.bilibili.com/player.html?bvid=${bv[1]}&autoplay=0`;
  return s;
}

/**
 * 视频编辑器：本地上传（落媒体卷）或平台 embed 链接二选一，
 * 附带封面海报上传与中英标题。清空即移除视频。
 */
export function VideoEditor({ dir, value, onChange }: Props) {
  const [kind, setKind] = useState<VideoAsset['kind']>(value?.kind ?? 'local');

  if (!value) {
    return (
      <button
        type="button"
        className={btnGhost}
        onClick={() => onChange({ kind: 'local', src: '' })}
      >
        启用视频
      </button>
    );
  }

  function patch(partial: Partial<VideoAsset>) {
    onChange({ ...value!, ...partial });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className={labelCls}>
          <label className="mr-3 inline-flex items-center gap-1 text-sm text-text-secondary">
            <input
              type="radio"
              name="video-kind"
              className="h-4 w-4 accent-accent"
              checked={kind === 'local'}
              onChange={() => {
                setKind('local');
                patch({ kind: 'local', src: '' });
              }}
            />
            本地上传
          </label>
          <label className="inline-flex items-center gap-1 text-sm text-text-secondary">
            <input
              type="radio"
              name="video-kind"
              className="h-4 w-4 accent-accent"
              checked={kind === 'embed'}
              onChange={() => {
                setKind('embed');
                patch({ kind: 'embed', src: '' });
              }}
            />
            平台链接
          </label>
        </span>
        <button type="button" className={`${btnDanger} ml-auto`} onClick={() => onChange(null)}>
          移除视频
        </button>
      </div>

      {kind === 'local' ? (
        <div>
          <span className={labelCls}>视频文件（mp4/webm/mov，≤200MB）</span>
          <MediaUpload dir={dir} kind="video" value={value.src} onChange={(url) => patch({ src: url })} />
        </div>
      ) : (
        <div>
          <span className={labelCls}>B站 / YouTube 播放页或 embed 地址</span>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={value.src}
              placeholder="https://www.bilibili.com/video/BV… 或 https://youtu.be/…"
              onChange={(e) => patch({ src: e.target.value })}
            />
            <button
              type="button"
              className={btnGhost}
              disabled={!value.src}
              onClick={() => patch({ src: toEmbedUrl(value.src) })}
            >
              转为 embed
            </button>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            点击「转为 embed」可自动识别 YouTube / B站分享链接；已标准 embed 地址可直接使用。
          </p>
        </div>
      )}

      <div>
        <span className={labelCls}>封面海报（可选）</span>
        <MediaUpload
          dir={dir}
          value={value.poster ?? ''}
          onChange={(url) => patch({ poster: url })}
        />
      </div>

      <div>
        <span className={labelCls}>视频标题</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputCls}
            value={value.title?.zh ?? ''}
            placeholder="中文标题"
            onChange={(e) => patch({ title: { zh: e.target.value, en: value.title?.en ?? '' } })}
          />
          <input
            className={inputCls}
            value={value.title?.en ?? ''}
            placeholder="English title"
            onChange={(e) => patch({ title: { zh: value.title?.zh ?? '', en: e.target.value } })}
          />
        </div>
      </div>
    </div>
  );
}
