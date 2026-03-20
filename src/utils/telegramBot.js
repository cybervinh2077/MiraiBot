const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TG_API = `https://api.telegram.org/bot${TOKEN}`;

let lastUpdateId = 0;
let discordClient = null;

function setDiscordClient(client) {
  discordClient = client;
}

async function sendMessage(chatId, text) {
  if (!TOKEN) return;
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
}

async function sendDocument(chatId, filePath, caption) {
  if (!TOKEN) return;
  const { FormData, Blob } = require('buffer');
  // Dùng multipart/form-data qua fetch
  const fileContent = fs.readFileSync(filePath);
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption || ''}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="bot.log"\r\nContent-Type: text/plain\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  await fetch(`${TG_API}/sendDocument`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body,
  }).catch(() => {});
}

function getSystemStatus() {
  const cpus = os.cpus();
  const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
  const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
  const usedMem = (totalMem - freeMem);
  const memPct = ((usedMem / totalMem) * 100).toFixed(1);
  const [load1, load5, load15] = os.loadavg();

  let cpuTemp = 'N/A';
  try {
    const raw = execSync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null').toString().trim();
    cpuTemp = (parseInt(raw) / 1000).toFixed(1) + '°C';
  } catch {}

  // Uptime hệ thống (khác với process uptime)
  const sysUptimeSec = Math.floor(os.uptime());
  const suh = Math.floor(sysUptimeSec / 3600);
  const sum = Math.floor((sysUptimeSec % 3600) / 60);
  const sysUptime = `${suh}h ${sum}m`;

  // Bot process uptime
  const botUptimeSec = Math.floor(process.uptime());
  const buh = Math.floor(botUptimeSec / 3600);
  const bum = Math.floor((botUptimeSec % 3600) / 60);
  const bus = botUptimeSec % 60;
  const botUptime = `${buh}h ${bum}m ${bus}s`;

  // Commit hiện tại
  let commitInfo = 'N/A';
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: path.join(__dirname, '../..') }).toString().trim();
    const msg = execSync('git log -1 --pretty=%s', { cwd: path.join(__dirname, '../..') }).toString().trim();
    commitInfo = `${hash} — ${msg.slice(0, 40)}`;
  } catch {}

  // Discord stats
  let discordInfo = 'Bot chưa sẵn sàng';
  if (discordClient?.isReady()) {
    const servers = discordClient.guilds.cache.size;
    const users = discordClient.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    discordInfo = `${servers} servers • ${users} users`;
  }

  return `<b>📊 MiraiBot Status</b>

<b>🤖 Discord</b>
├ ${discordInfo}
└ Ping: ${discordClient?.ws?.ping ?? 'N/A'}ms

<b>⚙️ Hệ thống (Orange Pi)</b>
├ CPU: ${cpus[0]?.model?.trim().slice(0, 30) || 'N/A'}
├ Nhiệt độ: ${cpuTemp}
├ Load: ${load1.toFixed(2)} / ${load5.toFixed(2)} / ${load15.toFixed(2)}
├ RAM: ${usedMem}MB / ${totalMem}MB (${memPct}%)
├ Uptime hệ thống: ${sysUptime}
└ Uptime bot: ${botUptime}

<b>📦 Phiên bản</b>
└ ${commitInfo}`;
}

async function handleCommand(chatId, text) {
  const cmd = text.trim().toLowerCase();

  if (cmd === '/start' || cmd === '/help') {
    return sendMessage(chatId,
      `<b>🤖 MiraiBot Control</b>\n\n` +
      `/status — Thông tin bot và hệ thống\n` +
      `/getlog — Lấy log Discord bot (50 dòng cuối)\n` +
      `/getlog_full — Tải toàn bộ file log\n` +
      `/getlog_err — Log lỗi (50 dòng cuối)`
    );
  }

  if (cmd === '/status') {
    return sendMessage(chatId, getSystemStatus());
  }

  if (cmd === '/getlog') {
    const logFile = path.join(__dirname, '../../logs/out.log');
    try {
      const lines = execSync(`tail -50 "${logFile}"`).toString();
      const text = lines.length > 4000 ? lines.slice(-4000) : lines;
      return sendMessage(chatId, `<b>📋 Log (50 dòng cuối)</b>\n<pre>${text.replace(/</g, '&lt;')}</pre>`);
    } catch {
      return sendMessage(chatId, '❌ Không đọc được log file.');
    }
  }

  if (cmd === '/getlog_full') {
    const logFile = path.join(__dirname, '../../logs/out.log');
    if (!fs.existsSync(logFile)) return sendMessage(chatId, '❌ Log file không tồn tại.');
    return sendDocument(chatId, logFile, 'MiraiBot out.log');
  }

  if (cmd === '/getlog_err') {
    const logFile = path.join(__dirname, '../../logs/error.log');
    try {
      const lines = execSync(`tail -50 "${logFile}"`).toString();
      const text = lines.length > 4000 ? lines.slice(-4000) : lines;
      return sendMessage(chatId, `<b>⚠️ Error log (50 dòng cuối)</b>\n<pre>${text.replace(/</g, '&lt;')}</pre>`);
    } catch {
      return sendMessage(chatId, '❌ Không đọc được error log.');
    }
  }
}

async function poll() {
  if (!TOKEN) return;
  try {
    const res = await fetch(`${TG_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    const data = await res.json();
    if (!data.ok || !data.result?.length) return;

    for (const update of data.result) {
      lastUpdateId = update.update_id;
      const msg = update.message;
      if (!msg?.text) continue;

      // Chỉ nhận lệnh từ CHAT_ID đã config
      if (String(msg.chat.id) !== String(CHAT_ID)) {
        await sendMessage(msg.chat.id, '⛔ Bạn không có quyền dùng bot này.');
        continue;
      }

      await handleCommand(msg.chat.id, msg.text);
    }
  } catch (e) {
    // Bỏ qua lỗi network, tự retry
  }
}

function start() {
  if (!TOKEN || !CHAT_ID) {
    console.log('⚠️  Telegram bot: TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID chưa được config, bỏ qua.');
    return;
  }
  console.log('📱 Telegram bot: đang lắng nghe lệnh...');
  // Long polling mỗi 2 giây
  setInterval(poll, 2000);
}

module.exports = { start, setDiscordClient, sendMessage };
