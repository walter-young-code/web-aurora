import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { NextResponse } from 'next/server';

/**
 * 动态媒体文件路由：从磁盘实时读取 /media/... 请求对应的文件。
 * 解决 Next.js 16 生产环境 public/ 目录启动快照导致运行期新上传文件 404 的问题。
 * 路由优先级高于 public/ 静态文件，因此所有 /media/* 请求均由此处理。
 */

const mediaRoot = path.resolve(process.env.MEDIA_DIR ?? './storage/media');

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
    const [fileInfo, fileBuf] = await Promise.all([stat(abs), readFile(abs)]);
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
