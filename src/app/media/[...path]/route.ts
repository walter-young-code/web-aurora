import path from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';

/**
 * 动态媒体文件路由：从磁盘实时读取 /media/... 请求对应的文件。
 * MEDIA_DIR 是 /media/* 的唯一来源（上传落盘与种子媒体同步都在这里），
 * 因此这里不设 public/ 回落：读不到就是不存在，与媒体库扫描结果一致。
 * 走运行期读盘也避开了 Next.js 生产环境 public/ 启动快照导致新上传文件 404 的问题。
 *
 * 流式响应 + Range 支持：
 * - 用 createReadStream + Readable.toWeb() 边读边发，避免大视频（上限 200MB）
 *   全量读入堆内存引发并发 OOM。
 * - 解析 Range 头，命中时返回 206 Partial Content，浏览器可拖动进度条 / 分段拉流。
 * - 起点越界的 Range 回 416 Range Not Satisfiable，播放器会回落到 200 全量请求。
 * - 多区间 / 语法错误的 Range 忽略，回 200 全量返回，保持行为宽松。
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

type RangeResult =
  | { kind: 'none' }
  | { kind: 'unsatisfiable' }
  | { kind: 'range'; start: number; end: number };

/**
 * 解析单区间 Range 头（形如 "bytes=start-end" / "bytes=-N" / "bytes=N-"）。
 * 多区间（"bytes=0-1,2-3"）与非法语法一律回落到 'none'，交给调用方发 200 全量响应。
 * 返回的 start/end 均为闭区间字节偏移，且保证 0 <= start <= end < size。
 */
function parseRange(header: string | null, size: number): RangeResult {
  if (!header) return { kind: 'none' };
  const trimmed = header.trim();
  if (!trimmed.startsWith('bytes=')) return { kind: 'none' };
  const spec = trimmed.slice('bytes='.length);
  if (spec.includes(',')) return { kind: 'none' }; // 多区间不支持，降级全量
  const m = /^(\d*)-(\d*)$/.exec(spec);
  if (!m) return { kind: 'none' };
  const [, rawStart, rawEnd] = m;
  if (!rawStart && !rawEnd) return { kind: 'none' };

  let start: number;
  let end: number;
  if (!rawStart) {
    // 后缀区间 bytes=-N：最后 N 个字节
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return { kind: 'none' };
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    if (!Number.isFinite(start) || start < 0) return { kind: 'none' };
    if (start >= size) return { kind: 'unsatisfiable' };
    if (rawEnd) {
      end = Number(rawEnd);
      if (!Number.isFinite(end) || end < start) return { kind: 'unsatisfiable' };
      if (end >= size) end = size - 1;
    } else {
      end = size - 1;
    }
  }
  return { kind: 'range', start, end };
}

/** 将 Node Readable 桥接为 Web ReadableStream（Next.js Route Handler 需要 Web Stream） */
function toWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const rel = segments.join('/');

  // 安全：杜绝路径穿越
  const abs = path.resolve(mediaRoot, rel);
  if (abs !== mediaRoot && !abs.startsWith(mediaRoot + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let fileInfo;
  try {
    fileInfo = await stat(/* turbopackIgnore: true */ abs);
  } catch {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  if (!fileInfo.isFile()) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const ext = path.extname(abs).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';
  const size = fileInfo.size;

  // 基础响应头：文件名含时间戳，内容不可变 → 长期缓存；显式声明支持字节区间
  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Last-Modified': fileInfo.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
  };

  const parsed = parseRange(req.headers.get('range'), size);

  if (parsed.kind === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes */${size}`,
      },
    });
  }

  if (parsed.kind === 'range') {
    const { start, end } = parsed;
    const stream = createReadStream(/* turbopackIgnore: true */ abs, { start, end });
    return new Response(toWebStream(stream), {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }

  // 无 Range / 无法识别的 Range：整文件流式返回，不再一次性 readFile 到 Buffer
  const stream = createReadStream(/* turbopackIgnore: true */ abs);
  return new Response(toWebStream(stream), {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(size),
    },
  });
}
