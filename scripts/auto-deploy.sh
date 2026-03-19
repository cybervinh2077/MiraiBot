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

# Fetch latest from remote
git fetch origin "$BRANCH" --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0  # No changes, do nothing
fi

log "🔄 New commit detected: $REMOTE"
log "📥 Pulling latest changes..."

git pull origin "$BRANCH" --quiet

log "📦 Installing dependencies..."
npm install --omit=dev --quiet

log "♻️  Restarting bot via PM2..."
pm2 restart miraibot --update-env

SHORT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)

log "✅ Deploy complete! Running commit: $SHORT"

tg_notify "✅ <b>MiraiBot deployed!</b>
📦 Commit: <code>$SHORT</code>
📝 $COMMIT_MSG
🕐 $(date '+%Y-%m-%d %H:%M:%S')"
