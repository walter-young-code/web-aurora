#!/usr/bin/env bash
# 单容器启动脚本：卷内首次自举种子库 → 迁移到最新 → 幂等建号 → 起常驻 Node 服务。
set -euo pipefail

# DATABASE_URL 形如 file:/data/aurora.db（容器挂卷），据此准备数据文件所在目录
DB_PATH=""
case "${DATABASE_URL:-}" in
  file:*) DB_PATH="${DATABASE_URL#file:}" ;;
esac

if [ -n "$DB_PATH" ]; then
  mkdir -p "$(dirname "$DB_PATH")" 2>/dev/null || true
  # 卷为空（首次部署）：用镜像内置的种子库自举，避免空站
  if [ ! -f "$DB_PATH" ] && [ -f ./prisma/seed.db ]; then
    cp ./prisma/seed.db "$DB_PATH"
    echo "[start] 首次运行：已从镜像种子库初始化 $DB_PATH"
  fi
fi

# 迁移到最新（幂等）：首次或版本升级后自动建/更新表结构
npx prisma migrate deploy

# 账户自举：按 ADMIN_EMAIL/ADMIN_PASSWORD 幂等创建管理员（已存在或未配置则跳过）
node ./scripts/init-admin.mjs

# 媒体目录补齐：MEDIA_DIR 是唯一对外的 /media/* 目录，挂空卷时镜像里的种子图会被遮蔽，
# 故每次启动调 sync-media.mjs 幂等灌入（只补缺失、不覆盖卷里已有的文件）。
node ./scripts/sync-media.mjs || echo "[start] 媒体种子补齐失败，前后台图可能 404，继续启动"

exec node server.js
