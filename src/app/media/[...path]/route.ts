import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * 动态媒体文件路由：从磁盘实时读取 /media/... 请求对应的文件。
 * MEDIA_DIR 是 /media/* 的唯一来源（上传落盘与种子媒体同步都在这里），
 * 因此这里不设 public/ 回落：读不到就是不存在，与媒体库扫描结果一致。
 * 走运行期读盘也避开了 Next.js 生产环境 public/ 启动快照导致新上传文件 404 的问题。
 */

// turbopackIgnore: 这里的读盘路径运行期才确定，不加标记会让 Turbopack 把整个项目（含源码）追进 standalone 产物
const mediaRoot = path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR ?? './storage/media');

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const rel = segments.join('/');

  // 安全：杜绝路径穿越
  const abs = path.resolve(mediaRoot, rel);
  if (abs !== mediaRoot && !abs.startsWith(mediaRoot + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [fileInfo, fileBuf] = await Promise.all([
      stat(/* turbopackIgnore: true */ abs),
      readFile(/* turbopackIgnore: true */ abs),
    ]);
    if (!fileInfo.isFile()) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const ext = path.extname(abs).toLowerCase();
    const contentType = MIME[ext] ?? 'application/octet-stream';

    return new Response(fileBuf, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileInfo.size),
        // 文件名含时间戳，内容不可变 → 长期缓存
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Last-Modified': fileInfo.mtime.toUTCString(),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
}
