# MiraiBot

Discord bot cho MyMirai, built with discord.js v14.

## Cấu trúc

```
MiraiBot/
├── src/
│   ├── commands/        # Slash commands
│   ├── events/          # Discord events
│   └── index.js
├── scripts/
│   ├── setup-pi.sh      # Setup môi trường trên Pi (chạy 1 lần)
│   └── auto-deploy.sh   # Auto pull & restart (chạy qua cron)
├── logs/                # Log files (gitignored)
├── .github/workflows/   # GitHub Actions CI
├── ecosystem.config.js  # PM2 config
├── .env.example
└── package.json
```

## Setup lần đầu trên Raspberry Pi

### 1. Clone repo
```bash
git clone https://github.com/<your-username>/MiraiBot.git
cd MiraiBot
```

### 2. Điền thông tin vào .env
```bash
cp .env.example .env
nano .env
```
```
TOKEN=your_bot_token
API_KEY=your_supabase_anon_key
```

### 3. Chạy setup script
```bash
bash scripts/setup-pi.sh
```

Script này sẽ tự động:
- Cài Node.js và PM2 nếu chưa có
- Cài dependencies
- Start bot với PM2
- Setup autostart khi Pi reboot
- Setup cron job tự pull mỗi 1 phút

## CI/CD Flow

```
Push lên GitHub
      ↓
GitHub Actions chạy lint/check
      ↓
Pi cron (mỗi 1 phút) phát hiện commit mới
      ↓
git pull → npm install → pm2 restart
```

## Lệnh hữu ích trên Pi

```bash
pm2 status                  # Xem trạng thái bot
pm2 logs miraibot           # Xem log bot
pm2 restart miraibot        # Restart thủ công
tail -f logs/deploy.log     # Xem log auto-deploy
```

## Thêm lệnh mới

Tạo file trong `src/commands/`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ten_lenh')
    .setDescription('Mô tả lệnh'),
  async execute(interaction) {
    await interaction.reply('Hello!');
  },
};
```
