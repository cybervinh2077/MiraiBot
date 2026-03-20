const { isGuildAuthed, setGuildAuth, getGuildAuth, clearGuildAuth, getPrefix, setPrefix } = require('../utils/guildAuth');
const { handleMusic } = require('../handlers/musicHandler');
const { t } = require('../utils/i18n');

const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

const MUSIC_COMMANDS = new Set([
  '?play', '?p', '?skip', '?s', '?stop', '?pause', '?resume',
  '?volume', '?vol', '?loop', '?shuffle', '?remove', '?clear',
  '?jump', '?queue', '?q', '?nowplaying', '?np', '?leave', '?dc',
  '?lyrics', '?ly',
]);

module.exports = {
  name: 'messageCreate',
  async execute(msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return; // Bỏ qua DM

    const guildId = msg.guild.id;
    const prefix = getPrefix(guildId);

    // Lệnh ?logout - chỉ người đã đăng nhập mới dùng được
    if (msg.content === `${prefix}logout`) {
      if (!isGuildAuthed(guildId)) {
        return msg.reply(t(guildId, 'logout_not_logged_in'));
      }
      const session = getGuildAuth(guildId);
      if (msg.author.id !== session.discordUserId) {
        return msg.reply(t(guildId, 'logout_no_permission', { user: session.discordUsername }));
      }
      clearGuildAuth(guildId);
      return msg.reply(t(guildId, 'logout_success', { prefix }));
    }

    // Lệnh ?login - bất kỳ ai cũng có thể dùng để đăng nhập cho server
    if (msg.content === `${prefix}login`) {
      if (isGuildAuthed(guildId)) {
        const session = getGuildAuth(guildId);
        return msg.reply(t(guildId, 'already_logged_in', { user: session.discordUsername, time: new Date(session.linkedAt).toLocaleString('vi-VN') }));
      }

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: API_KEY,
          },
          body: JSON.stringify({
            action: 'generate-login-link',
            discordUserId: msg.author.id,
            discordUsername: msg.author.username,
          }),
        });

        const data = await res.json();

        if (!data.loginUrl) {
          return msg.reply(t(guildId, 'login_failed'));
        }

        await msg.reply(t(guildId, 'login_link', { url: data.loginUrl }));

        // Poll for login completion every 5 seconds
        const interval = setInterval(async () => {
          try {
            const check = await fetch(API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: API_KEY,
              },
              body: JSON.stringify({
                action: 'check-login-status',
                state: data.state,
              }),
            });

            const result = await check.json();
            console.log('Poll result:', JSON.stringify(result));

            if (result.status === 'completed') {
              clearInterval(interval);
              setGuildAuth(guildId, {
                discordUserId: msg.author.id,
                discordUsername: msg.author.username,
                miraiUsername: result.username || 'Không rõ',
              });
              const miraiUsername = result.username || 'Không rõ';
              await msg.reply(t(guildId, 'login_success', { user: miraiUsername, guild: msg.guild.name }));
            }
          } catch (err) {
            console.error('Poll error:', err);
          }
        }, 5000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
      } catch (err) {
        console.error('Login error:', err);
        await msg.reply(t(guildId, 'login_error'));
      }

      return;
    }

    // Các lệnh khác bắt đầu bằng prefix cần kiểm tra auth
    if (msg.content.startsWith(prefix) && !isGuildAuthed(guildId)) {
      return msg.reply(t(guildId, 'not_logged_in', { prefix }));
    }

    // Lệnh ?ping
    if (msg.content === `${prefix}ping`) {
      const { execSync } = require('child_process');
      const os = require('os');

      const latency = Date.now() - msg.createdTimestamp;

      // Commit hiện tại
      let commitHash = 'N/A', commitMsg = 'N/A';
      try {
        commitHash = execSync('git rev-parse --short HEAD', { cwd: process.cwd() }).toString().trim();
        commitMsg = execSync('git log -1 --pretty=%s', { cwd: process.cwd() }).toString().trim();
      } catch {}

      // Uptime
      const uptimeSec = Math.floor(process.uptime());
      const uh = Math.floor(uptimeSec / 3600);
      const um = Math.floor((uptimeSec % 3600) / 60);
      const us = uptimeSec % 60;
      const uptime = `${uh}h ${um}m ${us}s`;

      // CPU & RAM
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model?.trim() || 'N/A';
      const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
      const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
      const usedMem = (totalMem - freeMem).toFixed(0);

      // CPU temp (Linux only)
      let cpuTemp = 'N/A';
      try {
        const raw = execSync('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null').toString().trim();
        cpuTemp = (parseInt(raw) / 1000).toFixed(1) + '°C';
      } catch {}

      // Load average
      const [load1, load5] = os.loadavg();

      return msg.reply(
        `🏓 **Pong!**\n` +
        `\`\`\`\n` +
        `📡 Độ trễ API  : ${latency}ms\n` +
        `🔌 WebSocket   : ${msg.client.ws.ping}ms\n` +
        `\n` +
        `📦 Phiên bản triển khai\n` +
        `   Commit : ${commitHash}\n` +
        `   Nội dung: ${commitMsg.slice(0, 50)}\n` +
        `\n` +
        `⏱️  Uptime      : ${uptime}\n` +
        `🖥️  CPU         : ${cpuModel}\n` +
        `🌡️  Nhiệt độ    : ${cpuTemp}\n` +
        `📊 Load avg    : ${load1.toFixed(2)} / ${load5.toFixed(2)}\n` +
        `💾 RAM         : ${usedMem}MB / ${totalMem}MB\n` +
        `\`\`\``
      );
    }
    if (msg.content === `${prefix}help`) {
      const helpText = buildHelpText(prefix, guildId);
      try {
        await msg.author.send(helpText);
        await msg.reply(t(guildId, 'help_dm_sent'));
      } catch {
        await msg.reply(helpText);
      }
      return;
    }

    // Lệnh music
    const args = msg.content.trim().split(/\s+/);
    const command = args.shift().toLowerCase();
    // Chuyển đổi lệnh music sang dạng có prefix động
    const musicCommandsWithPrefix = new Set([...MUSIC_COMMANDS].map(c => prefix + c.slice(1)));
    if (musicCommandsWithPrefix.has(command)) {
      const baseCommand = '?' + command.slice(prefix.length);
      return handleMusic(msg, baseCommand, args);
    }

    // Lệnh prefix
    if (command === `${prefix}prefix`) {
      const session = getGuildAuth(guildId);
      if (msg.author.id !== session?.discordUserId) {
        return msg.reply(t(guildId, 'prefix_no_permission', { user: session?.discordUsername || '?' }));
      }
      const newPrefix = args[0];
      if (!newPrefix || newPrefix.length > 3) {
        return msg.reply(t(guildId, 'prefix_invalid'));
      }
      setPrefix(guildId, newPrefix);
      return msg.reply(t(guildId, 'prefix_success', { prefix: newPrefix }));
    }

    // Lệnh ?info
    if (command === `${prefix}info`) {
      const session = getGuildAuth(guildId);
      const linkedAt = new Date(session.linkedAt);
      const diffMs = Date.now() - linkedAt;
      const days = Math.floor(diffMs / 86400000);
      const hours = Math.floor((diffMs % 86400000) / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      let duration = '';
      if (days > 0) duration += t(guildId, 'duration_days', { d: days });
      if (hours > 0) duration += t(guildId, 'duration_hours', { h: hours });
      duration += t(guildId, 'duration_minutes', { m: minutes });

      return msg.reply([
        t(guildId, 'info_title'),
        t(guildId, 'info_discord', { user: session.discordUsername }),
        t(guildId, 'info_mirai', { user: session.miraiUsername || '?' }),
        t(guildId, 'info_linked_at', { time: linkedAt.toLocaleString('vi-VN') }),
        t(guildId, 'info_duration', { duration }),
        t(guildId, 'info_prefix', { prefix }),
      ].join('\n'));
    }
  },
};

function buildHelpText(prefix, guildId) {
  return [
    '📖 **MiraiBot Commands**',
    '',
    '**🔐 Account**',
    `\`${prefix}login\` \`/login\``,
    `\`${prefix}logout\` \`/logout\``,
    `\`${prefix}info\` \`/info\``,
    `\`${prefix}prefix\` \`/prefix\``,
    `\`/lang\` — Change language (vn/en/jp)`,
    '',
    '**🎵 Music**',
    `\`${prefix}play\` \`/play\` — Play or queue a song`,
    `\`${prefix}skip\` \`/skip\` | \`${prefix}stop\` \`/stop\``,
    `\`${prefix}pause\` \`/pause\` | \`${prefix}resume\` \`/resume\``,
    `\`${prefix}queue\` \`/queue\` | \`${prefix}nowplaying\` \`/nowplaying\``,
    `\`${prefix}volume\` \`/volume\` | \`${prefix}loop\` \`/loop\``,
    `\`${prefix}shuffle\` \`/shuffle\` | \`${prefix}lyrics\` \`/lyrics\``,
    `\`${prefix}leave\` \`/leave\``,
    '',
    '**🎭 Fun**',
    `\`/hug\` \`/kiss\` \`/cuddle\``,
    '',
    '**🛠️ Other**',
    `\`${prefix}ping\` \`/ping\` | \`${prefix}help\` \`/help\``,
    '',
    '**🎲 D&D** — `/start-campaign` `/assign-char` `/action` and more',
  ].join('\n');
}
