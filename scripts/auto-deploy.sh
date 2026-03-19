#!/bin/bash
# Auto-deploy script for Raspberry Pi
# Chạy mỗi 1 phút qua cron để tự pull và restart khi có commit mới

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$REPO_DIR/logs/deploy.log"
BRANCH="main"

mkdir -p "$REPO_DIR/logs"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
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

log "✅ Deploy complete! Running commit: $(git rev-parse --short HEAD)"
