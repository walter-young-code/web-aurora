# 单容器部署：多阶段构建，产出 Next.js standalone，运行期卷内自举 + 迁移 + 起服务。
# 不声明 `# syntax=docker/dockerfile:1`：未使用 BuildKit 前沿语法，省去从 docker.io 拉 frontend 镜像的一步。

# ---- deps：仅按锁文件装依赖（含原生模块 better-sqlite3 / sharp 的编译）----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# apt 换国内 Debian 源：直连 deb.debian.org 大文件易停滞卡死（实测）；海外部署可改回 deb.debian.org
ARG DEBIAN_MIRROR=mirrors.aliyun.com
RUN sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
# npm ci 会触发 postinstall（prisma generate）：需 schema 与 config 就位；
# Prisma 7 的 env() 为立即求值，故 DATABASE_URL 此时必须存在（generate 不连库，占位值即可）
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
ENV DATABASE_URL="file:./prisma/deps-placeholder.db"
# 依赖走 npmmirror 加速：lock 里的 registry.npmjs.org 由 replace-registry-host=npmjs 自动改写；海外可换回官方源
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm ci --registry=${NPM_REGISTRY} --replace-registry-host=npmjs

# ---- builder：生成 Client → 建库播种（供构建期预渲染铺量）→ next build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV DATABASE_URL="file:./prisma/build.db"
# better-auth 在 NODE_ENV=production 下缺 secret 会在模块加载时抛错（unhandled rejection 直接终止构建）。
# 构建期给占位值：admin 相关路由全部动态渲染，不会把值写进产物；运行期由容器注入真实 AUTH_SECRET。
ENV AUTH_SECRET="build-time-placeholder-do-not-use-at-runtime"
# 与上条 RUN 的 control=memory 配套：堆顶设 6G，触发及时 GC（见 builder 末尾注释）
ENV NODE_OPTIONS="--max-old-space-size=6144"
# 站点绝对地址需在构建期确定：NEXT_PUBLIC_* 会被内联进产物，且 robots / canonical 仍依赖它。
# （sitemap 已改为运行期生成，不再受构建期烘焙限制）
# 由 compose 的 build.args 传入（与运行期 environment 同源）；直建时用默认值演习。
ARG NEXT_PUBLIC_SITE_URL=https://example.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# 前台是运行期渲染（force-dynamic），构建不再需要真内容；这里迁移+播种只为两件事：
# 产出 build.db 当作运行首启的自举模板（拷成 prisma/seed.db），并让构建期任何读库环节不报错
RUN npx prisma migrate deploy
RUN npm run db:seed
# control=memory 把该步骤容器限制在 8G：实测不限时 Turbopack 构建会在 ~100s 无节制涨满 16G 被 OOM killer 杀掉（exit 137）。
# 配套 V8 堆上限 6G（留 2G 给 Rust 侧与页内 worker），让 Node 提前 GC 而不是被动挨杀。
# 若未来升级 Next 移除该实验语法，退回方案：宿主机 docker build --memory=8g。
# control:memory=8g,cpus=8
RUN npm run build

# ---- runner：瘦身运行镜像 ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# prisma migrate deploy 需要 OpenSSL；sharp 需要 libstdc++
# apt 换国内 Debian 源（同 deps 阶段）；海外部署可改回 deb.debian.org
ARG DEBIAN_MIRROR=mirrors.aliyun.com
RUN sed -i "s|deb.debian.org|${DEBIAN_MIRROR}|g" /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl libstdc++6 \
  && rm -rf /var/lib/apt/lists/*

# standalone 自带 server.js 与被 trace 的运行依赖
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 种子媒体（版本库内置的封面/头像）随镜像发布，但运行期不从这里直接对外：
# start.sh 调 sync-media.mjs 把它幂等灌进 MEDIA_DIR，让 /media/* 只有这一个目录来源
COPY --from=builder /app/media-seed ./media-seed
COPY --from=builder /app/scripts/sync-media.mjs ./scripts/sync-media.mjs
# 覆盖为完整 node_modules：保证运行期 prisma migrate CLI / schema-engine 可用
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# 构建期已播种的库作为「首次运行自举模板」：卷为空时复制过去，避免空站
COPY --from=builder /app/prisma/build.db ./prisma/seed.db
COPY --from=builder /app/scripts/start.sh ./start.sh
# 启动脚本用：按 ADMIN_EMAIL/ADMIN_PASSWORD 幂等建管理员（不依赖 src/ 与生成物）
COPY --from=builder /app/scripts/init-admin.mjs ./scripts/init-admin.mjs
# 运维脚本：重置/创建管理员密码（绕过 ensureAdmin 的「已存在即跳过」），docker compose exec 调用
COPY --from=builder /app/scripts/reset-admin-password.mjs ./scripts/reset-admin-password.mjs
RUN chmod +x ./start.sh

EXPOSE 3000
CMD ["bash", "./start.sh"]
