#!/bin/bash
# Chạy script này 1 lần duy nhất trên Raspberry Pi để setup môi trường

set -e

echo "🚀 Setting up MiraiBot on Raspberry Pi..."

# 1. Install Node.js (nếu chưa có)
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

echo "✅ PM2: $(pm2 -v)"

# 3. Install dependencies
echo "📦 Installing bot dependencies..."
npm install --omit=dev

# 4. Setup .env nếu chưa có
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  File .env đã được tạo từ .env.example"
  echo "⚠️  Hãy điền TOKEN và API_KEY vào file .env trước khi chạy bot!"
  echo ""
fi

# 5. Tạo thư mục logs
mkdir -p logs

# 6. Cấp quyền execute cho scripts
chmod +x scripts/auto-deploy.sh

# 7. Start bot với PM2
echo "🤖 Starting MiraiBot..."
pm2 start ecosystem.config.js

# 8. Save PM2 process list & setup autostart
pm2 save
pm2 startup | tail -1 | bash || true

# 9. Setup cron job để auto-deploy mỗi 1 phút
CRON_JOB="* * * * * cd $(pwd) && bash scripts/auto-deploy.sh"
(crontab -l 2>/dev/null | grep -v "auto-deploy.sh"; echo "$CRON_JOB") | crontab -

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     MiraiBot Setup Complete!         ║"
echo "╚══════════════════════════════════════╝"
echo "📋 PM2 status: pm2 status"
echo "📜 Bot logs  : pm2 logs miraibot"
echo "📜 Deploy log: tail -f logs/deploy.log"
echo ""
