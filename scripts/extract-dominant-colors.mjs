// 为每张作品封面提取主色调，写回 src/content/works/index.json 的 dominantColor（seed 夹具用）。
// 用途：DominantColorImage 的占位底色，杜绝白块与 CLS。
// 运行：npm run extract-colors（先 npm run sync:media，封面在 MEDIA_DIR 里）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src/content/works/index.json');
// 媒体唯一目录：与 src/lib/media.ts 保持同一个默认值
const mediaDir = resolve(process.env.MEDIA_DIR ?? join(root, 'storage/media'));

const hex = (n) => n.toString(16).padStart(2, '0');
const MAX_CHANNEL = 0x4d;

/**
 * 占位色只用于图片到达前的一瞬，页面默认是暗色底。
 * 若封面大面积偏亮（天空/盐滩），直接取主色会变成一块刺眼的浅色，
 * 所以按比例压到最亮通道不超过 MAX_CHANNEL，保留色相与相对明暗。
 */
function darken(rgb) {
  const peak = Math.max(...rgb);
  if (peak <= MAX_CHANNEL || peak === 0) return rgb;
  const k = MAX_CHANNEL / peak;
  return rgb.map((v) => Math.round(v * k));
}

/** 量化到 4bit/通道后取出现频次最高的色桶；比整图平均色更接近观感主色，也不会被高光/阴影拉灰。 */
async function dominantColor(file) {
  const { data, info } = await sharp(file)
    .resize({ width: 48, height: 48, fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();
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

const works = JSON.parse(readFileSync(dataPath, 'utf8'));
let changed = 0;

for (const work of works) {
  const file = join(mediaDir, work.cover.replace(/^\/media\//, ''));
  if (!existsSync(file)) {
    console.warn(`跳过 ${work.slug}：找不到 ${work.cover}`);
    continue;
  }
  const color = await dominantColor(file);
  if (work.dominantColor !== color) {
    work.dominantColor = color;
    changed++;
  }
  console.log(`${work.slug.padEnd(20)} ${color}  ${work.cover}`);
}

if (changed > 0) {
  writeFileSync(dataPath, `${JSON.stringify(works, null, 2)}\n`, 'utf8');
  console.log(`\n已写入 ${changed} 个 dominantColor`);
} else {
  console.log('\ndominantColor 无变化');
}
