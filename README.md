# Aurora · 个人作品展示站

暗色沉浸式个人网站：以图片和视频为主角的「深夜私人画廊」。首页、作品、推荐三大板块，中英双语，带管理后台。UI 只是安静的画框，内容才是主角。

- 前台：`/[locale]`（`zh` / `en`，默认中文）、`/works`、`/works/[slug]`、`/recommendations`
- 后台：`/admin`（Better Auth 登录保护，界面仅中文）
- 数据：Prisma 7 + SQLite，唯一内容源；前台运行期渲染（`force-dynamic`），读取用 `unstable_cache` + 标签失效在进程内复用
- 部署：单容器 Docker（Next.js `output: 'standalone'` + `node server.js`）

## 技术栈

| 模块 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router + Turbopack） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4（`@theme` 设计 token） |
| 内容 | Prisma 7 + SQLite（MDX/JSON 退役为 seed 夹具） |
| 认证 | Better Auth（账号密码 + Prisma adapter） |
| i18n | next-intl（`[locale]` 路由段，双语全量） |
| 动效 | GSAP + @gsap/react + ScrollTrigger（仅签名动效 + 统一入场） |
| 媒体 | next/image（AVIF/WebP）、sharp（主色调提取）、点击式视频嵌入 |

## 环境要求

- Node.js 20.11+（推荐 22 LTS）
- npm（本项目脚本一律可用 `npm` / 在 Windows PowerShell 下用 `npm.cmd`）

## 本地开发

```bash
# 1. 安装依赖（postinstall 会自动 prisma generate）
npm install

# 2. 准备环境变量：首次从示例复制，本地默认值即可直接跑
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux

# 3. 建表 + 播种内容（9 作品 / 12 文档 / 6 推荐 / 1 资料 / 1 管理员）
npm run db:migrate
npm run db:seed

# 4. 起开发服务器（默认 http://localhost:3000；predev 会先把 media-seed/ 灌进 storage/media）
npm run dev
```

后台入口 `http://localhost:3000/admin`，账号由 `db:seed` 按 `.env` 里的 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 创建（留空则跳过，可随时手动补建：`node scripts/init-admin.mjs`）。注册端点已关闭，账号只能这样创建。

> ⚠️ Windows 已知问题：`next dev`（Turbopack watch）下 `better-sqlite3` 原生插件可能触发 Node 断言崩溃，但崩溃前所有请求状态码正确，**非应用缺陷**。生产 standalone 不跑 watcher，不受影响。本地冒烟验证以 `npm run dev` 为准。

### 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器（启动前自动补齐种子媒体） |
| `npm run sync:media` | 把 `media-seed/` 幂等灌进 `MEDIA_DIR`（只补缺失、不覆盖） |
| `npm run build` | 生产构建（standalone；前台为运行期渲染，不铺静态页） |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | 开发期建表/迁移 |
| `npm run db:seed` | 播种初始内容 |
| `npm run db:studio` | Prisma Studio 看数据 |

> `next start` 与 `output: 'standalone'` 不兼容，不要用 `npm run start` 起生产；生产一律走 Docker（容器内 `node server.js`）。

## Docker 部署（推荐）

单容器即可跑全站：SQLite 与上传媒体各挂一个命名卷，容器重建数据不丢。

```bash
# 1. 准备生产环境变量
cp .env.example .env
#   编辑 .env：
#     - AUTH_SECRET        换成强随机值：openssl rand -base64 32
#     - NEXT_PUBLIC_SITE_URL / BETTER_AUTH_URL  换成你的正式域名（见下节）
#     - ADMIN_EMAIL / ADMIN_PASSWORD  管理员账号（每次容器启动幂等补建）

# 2. 构建并启动
docker compose up -d --build

# 3. 查看运行状态 / 日志
docker compose ps
docker compose logs -f aurora
```

访问 `http://<服务器IP>:3000`。每次启动时 `scripts/start.sh` 会：卷内数据目录为空 → 从镜像内的种子库自举 → `prisma migrate deploy` → 按 `ADMIN_EMAIL`/`ADMIN_PASSWORD` 幂等建号（已存在则跳过）→ `node scripts/sync-media.mjs` 把镜像里的 `media-seed/` 幂等补齐进 `MEDIA_DIR` → `node server.js`。

### 数据持久化与备份

- `aurora-db` 卷：SQLite 库（内容 + 账号）。备份即导出该卷里的 `aurora.db`。
- `aurora-media` 卷：`storage/media`，也是 `/media/*` 的唯一目录 —— 后台上传落这里，仓库内置的种子图（`media-seed/`）每次启动补齐到这里，Route Handler 只从这里读。
- 升级镜像：`docker compose up -d --build`，迁移对新表结构幂等执行，卷数据保留。

### 反向代理

容器只监听 3000，生产建议在前面放一层 Nginx / Caddy 处理 HTTPS 与域名：

```nginx
server {
  listen 443 ssl http2;
  server_name example.com;              # 换成你的域名
  # ssl_certificate ...; ssl_certificate_key ...;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 自定义域名

1. DNS：把域名 `A` 记录指向服务器 IP（或 `CNAME` 指向负载均衡/反代）。
2. 反代：按上节配置 `server_name` 与证书（Let's Encrypt / 云厂商证书）。
3. 环境变量：`.env` 里三处必须与最终对外地址**完全一致**（含 `https://` 与是否带 `www`）：
   - `NEXT_PUBLIC_SITE_URL` —— sitemap / robots / OG / 结构化数据的绝对地址来源
   - `BETTER_AUTH_URL` —— Better Auth 回调与 Cookie 域
   - `AUTH_SECRET` —— 会话签名密钥（与域名无关，但上线前务必换强随机值）
4. 重建：`docker compose up -d --build`（`AUTH_SECRET` 变更后需重新登录）。

> `NEXT_PUBLIC_SITE_URL` 由 compose 的 `build.args` 同时注入构建期与运行期：它会被内联进产物（robots / OG / canonical 依赖它），**改域名必须重新 build**，只重启容器不生效；`BETTER_AUTH_URL` / `AUTH_SECRET` 为运行期读取，仅需重启容器。`/sitemap.xml` 已改为运行期生成，跟随库内容。

## 上线检查清单（Phase 5）

- [ ] `npm run typecheck`、`npm run lint`（0 error）、`npm run build` 全绿
- [ ] `.env` 三处域名/密钥已替换为正式值，`AUTH_SECRET` 为强随机
- [ ] `docker compose up -d --build` 后访问首页、`/works`、`/works/[slug]`、`/recommendations`、`/admin` 均正常
- [ ] `/sitemap.xml`、`/robots.txt` 可访问且双语 URL 与 `hreflang`（含 `x-default`）完整
- [ ] 移动端 375px 逐页布局无溢出；图片有主色占位、无白块闪烁
- [ ] Lighthouse（移动端）实测：LCP < 2.5s、CLS < 0.1、INP < 200ms
- [ ] 后台登录后作品/推荐/资料增删改，前台刷新即见最新库内容
- [ ] 已对 `aurora-db` / `aurora-media` 卷配置备份
