#!/bin/bash
# Auto-deploy script for Orange Pi
# Chạy mỗi 1 phút qua cron để tự pull và restart khi có commit mới

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$REPO_DIR/logs/deploy.log"
BRANCH="main"

# Load .env để lấy Telegram config
if [ -f "$REPO_DIR/.env" ]; then
  export $(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=' "$REPO_DIR/.env" | xargs)
fi

mkdir -p "$REPO_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

tg_notify() {
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TELEGRAM_CHAT_ID" \
      -d text="$1" \
      -d parse_mode="HTML" \
      > /dev/null 2>&1
  fi
}

cd "$REPO_DIR" || exit 1

# Lock chống chạy chồng (cron 1 phút có thể đè lên lần deploy trước)
LOCK_FILE="$REPO_DIR/logs/.deploy.lock"
if [ -f "$LOCK_FILE" ]; then
  PID=$(cat "$LOCK_FILE" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    exit 0  # Lần deploy trước còn đang chạy
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Fetch latest from remote
if ! git fetch origin "$BRANCH" --quiet; then
  log "❌ git fetch failed (mạng?)."
  exit 1
fi

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # No changes, do nothing
fi

REMOTE_SHORT=$(git rev-parse --short "$REMOTE")
log "🔄 New commit detected: $REMOTE_SHORT"

# Mirror chính xác remote — miễn nhiễm với working tree bẩn (vd npm install
# sửa package-lock.json) hay lệch commit. Chỉ động tới file đã track; .env,
# data/, logs/ (đều gitignored) được giữ nguyên.
log "📥 Resetting to origin/$BRANCH..."
if ! git reset --hard "origin/$BRANCH" --quiet; then
  log "❌ git reset --hard failed."
  tg_notify "❌ <b>MiraiBot deploy FAILED</b>
📦 Target: <code>$REMOTE_SHORT</code>
⚠️ git reset --hard không chạy được. Cần kiểm tra server thủ công.
🕐 $(date '+%Y-%m-%d %H:%M:%S')"
  exit 1
fi

# Xác nhận HEAD đã thực sự nhảy đúng commit remote
NEW_LOCAL=$(git rev-parse HEAD)
if [ "$NEW_LOCAL" != "$REMOTE" ]; then
  log "❌ HEAD ($NEW_LOCAL) != REMOTE ($REMOTE) sau khi reset."
  tg_notify "❌ <b>MiraiBot deploy FAILED</b>
📦 Target: <code>$REMOTE_SHORT</code>
⚠️ HEAD không khớp remote sau reset.
🕐 $(date '+%Y-%m-%d %H:%M:%S')"
  exit 1
fi

log "📦 Installing dependencies..."
npm install --omit=dev --quiet

log "♻️  Restarting bot via PM2..."
if ! pm2 restart miraibot --update-env; then
  log "❌ pm2 restart failed."
  tg_notify "❌ <b>MiraiBot deploy FAILED</b>
📦 Commit: <code>$REMOTE_SHORT</code>
⚠️ pm2 restart không chạy được (bot có thể đã tắt).
🕐 $(date '+%Y-%m-%d %H:%M:%S')"
  exit 1
fi

SHORT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)

log "✅ Deploy complete! Running commit: $SHORT"

tg_notify "✅ <b>MiraiBot deployed!</b>
📦 Commit: <code>$SHORT</code>
📝 $COMMIT_MSG
🕐 $(date '+%Y-%m-%d %H:%M:%S')"
