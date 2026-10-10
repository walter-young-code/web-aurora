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

# 媒体目录自举：MEDIA_DIR 挂的是空卷时，镜像内置的封面/头像会被遮蔽，
# 故首次运行把纯净副本 .media-seed 灌进去，保证既有作品图片照常可访问。
MEDIA_PATH="${MEDIA_DIR:-./public/media}"
case "$MEDIA_PATH" in
  /*) : ;;
  *) MEDIA_PATH="/app/$MEDIA_PATH" ;;
esac
if [ -d /app/public/.media-seed ] && [ ! -e "$MEDIA_PATH/works" ]; then
  mkdir -p "$MEDIA_PATH"
  cp -a /app/public/.media-seed/. "$MEDIA_PATH/"
  echo "[start] 首次运行：已从镜像种子媒体初始化 $MEDIA_PATH"
fi

exec node server.js
