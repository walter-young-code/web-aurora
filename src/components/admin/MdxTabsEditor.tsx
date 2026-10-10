'use client';

import { useState } from 'react';

type Props = {
  valueZh: string;
  valueEn: string;
  onChangeZh: (v: string) => void;
  onChangeEn: (v: string) => void;
};

/** MDX 正文的中/英双语编辑：两个 Tab 各编辑一份。 */
export function MdxTabsEditor({ valueZh, valueEn, onChangeZh, onChangeEn }: Props) {
  const [tab, setTab] = useState<'zh' | 'en'>('zh');
  const tabs: { id: 'zh' | 'en'; label: string }[] = [
    { id: 'zh', label: '中文正文' },
    { id: 'en', label: 'English body' },
  ];

  return (
    <div className="rounded-lg border border-line bg-bg">
      <div className="flex gap-1 border-b border-line px-2 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              'rounded-t-md px-3 py-1.5 text-sm transition-colors ' +
              (tab === t.id
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-secondary hover:text-text-primary')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        <textarea
          className="min-h-[240px] w-full rounded-md border border-line bg-bg-elevated p-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
          value={tab === 'zh' ? valueZh : valueEn}
          onChange={(e) => (tab === 'zh' ? onChangeZh(e.target.value) : onChangeEn(e.target.value))}
          placeholder="MDX 正文（文字为主）。相册与视频请用上方「相册」「视频」卡片管理，无需在此手写 <ImageGallery /> / <LazyVideoEmbed />"
        />
        <p className="mt-2 text-xs text-text-muted">
          相册/视频已结构化；历史正文里的手写标签仍可渲染（兼容），建议迁到上方卡片。
        </p>
      </div>
    </div>
  );
}
