import sharp from 'sharp';

/**
 * 封面主色调提取：与 scripts/extract-dominant-colors.mjs 同一算法，供后台上传时就地计算并写入 DB。
 * 用作 DominantColorImage 的占位底色，杜绝白块闪烁与 CLS。
 */
const hex = (n: number) => n.toString(16).padStart(2, '0');
const MAX_CHANNEL = 0x4d;

/**
 * 占位色只用于图片到达前的一瞬，页面底色是 #0a0a0b。封面大面积偏亮时直接取主色会刺眼，
 * 按比例压到最亮通道不超过 MAX_CHANNEL，保留色相与相对明暗。
 */
function darken(rgb: number[]): number[] {
  const peak = Math.max(...rgb);
  if (peak <= MAX_CHANNEL || peak === 0) return rgb;
  const k = MAX_CHANNEL / peak;
  return rgb.map((v) => Math.round(v * k));
}

/** 量化到 4bit/通道后取出现频次最高的色桶；比整图平均色更接近观感主色，也不会被高光/阴影拉灰。 */
export async function computeDominantColor(
  input: Parameters<typeof sharp>[0],
): Promise<string> {
  const { data, info } = await sharp(input)
    .resize({ width: 48, height: 48, fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map<string, number>();
  const channels = [0, 0, 0];

  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    channels[0] += r;
    channels[1] += g;
    channels[2] += b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luminance = (max + min) / 2 / 255;
    // 纯黑纯白像素对占位底色没有信息量，投票时跳过
    if (luminance > 0.08 && luminance < 0.92) {
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  if (buckets.size === 0) {
    const n = info.width * info.height;
    return `#${darken(channels.map((v) => Math.round(v / n)))
      .map((v) => hex(v))
      .join('')}`;
  }

  let best = { key: '', count: -1 };
  for (const [key, count] of buckets) {
    if (count > best.count) best = { key, count };
  }
  // 取桶中心值，避免量化把颜色推向某一端
  return `#${darken(best.key.split('-').map((v) => Number(v) * 16 + 8))
    .map((v) => hex(v))
    .join('')}`;
}
