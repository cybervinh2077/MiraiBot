const { isGuildAuthed, setGuildAuth, getGuildAuth, clearGuildAuth, getPrefix, setPrefix } = require('../utils/guildAuth');
const { handleMusic } = require('../handlers/musicHandler');

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
        return msg.reply('⚠️ Server này chưa đăng nhập, không có gì để logout.');
      }

      const session = getGuildAuth(guildId);
      if (msg.author.id !== session.discordUserId) {
        return msg.reply(
          `❌ Bạn không có quyền logout. Chỉ **${session.discordUsername}** (người đã đăng nhập) mới có thể thực hiện.`
        );
      }

      clearGuildAuth(guildId);
      return msg.reply('👋 Đã logout thành công. Bot sẽ không hoạt động cho đến khi có người dùng `?login` lại.');
    }

    // Lệnh ?login - bất kỳ ai cũng có thể dùng để đăng nhập cho server
    if (msg.content === `${prefix}login`) {
      if (isGuildAuthed(guildId)) {
        const session = getGuildAuth(guildId);
        return msg.reply(
          `✅ Server này đã được đăng nhập bởi **${session.discordUsername}** lúc ${new Date(session.linkedAt).toLocaleString('vi-VN')}.`
        );
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
          return msg.reply('❌ Không thể tạo link đăng nhập. Vui lòng thử lại sau.');
        }

        await msg.reply(
          `🔗 Để liên kết tài khoản MyMirai cho server này, truy cập:\n${data.loginUrl}\n\n⏳ Link có hiệu lực trong 10 phút.`
        );

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
              await msg.reply(
                `✅ Đăng nhập thành công! Xin chào **${miraiUsername}**!\nTất cả thành viên trong server **${msg.guild.name}** giờ có thể dùng bot.`
              );
            }
          } catch (err) {
            console.error('Poll error:', err);
          }
        }, 5000);

        // Stop polling after 10 minutes
        setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
      } catch (err) {
        console.error('Login error:', err);
        await msg.reply('❌ Có lỗi xảy ra. Vui lòng thử lại sau.');
      }

      return;
    }

    // Các lệnh khác bắt đầu bằng prefix cần kiểm tra auth
    if (msg.content.startsWith(prefix) && !isGuildAuthed(guildId)) {
      return msg.reply(
        `⚠️ Bot chưa được đăng nhập cho server này. Dùng lệnh \`${prefix}login\` để liên kết tài khoản MyMirai.`
      );
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
      return msg.reply([
        '📖 **Danh sách lệnh MiraiBot**',
        '',
        '**🔐 Tài khoản**',
        `\`${prefix}login\` — Liên kết tài khoản MyMirai cho server`,
        `\`${prefix}logout\` — Hủy liên kết (chỉ người đã đăng nhập)`,
        `\`${prefix}info\` — Xem thông tin tài khoản đã liên kết`,
        `\`${prefix}prefix <ký tự>\` — Đổi prefix (chỉ người đã đăng nhập)`,
        '',
        '**🎵 Nhạc**',
        `\`${prefix}play <tên/url>\` — Phát nhạc hoặc thêm vào queue`,
        `\`${prefix}skip\` — Bỏ qua bài hiện tại`,
        `\`${prefix}stop\` — Dừng nhạc và xóa queue`,
        `\`${prefix}pause\` — Tạm dừng`,
        `\`${prefix}resume\` — Tiếp tục phát`,
        `\`${prefix}queue\` — Xem danh sách queue`,
        `\`${prefix}nowplaying\` — Xem bài đang phát`,
        `\`${prefix}volume <0-200>\` — Chỉnh âm lượng`,
        `\`${prefix}loop\` — Loop bài hiện tại`,
        `\`${prefix}loop queue\` — Loop toàn bộ queue`,
        `\`${prefix}shuffle\` — Shuffle queue`,
        `\`${prefix}remove <số>\` — Xóa bài khỏi queue`,
        `\`${prefix}jump <số>\` — Nhảy đến bài thứ N`,
        `\`${prefix}clear\` — Xóa toàn bộ queue`,
        `\`${prefix}leave\` — Bot rời kênh voice`,
        `\`${prefix}lyrics\` — Lấy lời bài đang phát`,
        `\`${prefix}lyrics <tên bài>\` — Tìm lời bài theo tên`,
        '',
        '**🛠️ Khác**',
        `\`${prefix}ping\` — Kiểm tra độ trễ & thông tin hệ thống`,
        `\`${prefix}help\` — Hiện danh sách lệnh này`,
        '',
        '**🎲 D&D — Echoes of the Forgotten Broadcast**',
        '*Multiplayer:*',
        '`/start-campaign` — Bắt đầu campaign mới',
        '`/assign-char` — Chọn nhân vật (kai/miko/reno/dj)',
        '`/party-status` — Xem trạng thái party',
        '`/roll-signal` — Toàn party roll signal (buff/debuff)',
        '`/roll-init` — Roll initiative',
        '`/action` — Dùng ability tấn công',
        '`/quest-log` — Xem danh sách quest',
        '`/complete-quest` — Hoàn thành quest + nhận XP',
        '`/channel-surf` — Đổi kit + roll init',
        '`/stat` — Xem stat block nhân vật/boss',
        '',
        '*Solo:*',
        '`/solo-start` — Bắt đầu solo (3 AI đồng hành)',
        '`/solo-next` — Tiến lượt tiếp / bắt đầu encounter',
        '`/solo-auto` — Bật/tắt auto-combat',
        '`/solo-quest` — Skip đến quest/channel cụ thể',
        '',
        '*Save/Load:*',
        '`/save-state` — Lưu thủ công',
        '`/load-state` — Xem snapshot save file',
      ].join('\n'));
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
        return msg.reply(`❌ Chỉ **${session?.discordUsername || 'người đã đăng nhập'}** mới có thể đổi prefix.`);
      }
      const newPrefix = args[0];
      if (!newPrefix || newPrefix.length > 3) {
        return msg.reply('❌ Prefix không hợp lệ. Tối đa 3 ký tự, ví dụ: `!`, `!!`, `m!`');
      }
      setPrefix(guildId, newPrefix);
      return msg.reply(`✅ Đã đổi prefix thành \`${newPrefix}\`. Dùng \`${newPrefix}help\` để xem lệnh.`);
    }

    // Lệnh ?info
    if (command === `${prefix}info`) {
      const session = getGuildAuth(guildId);
      const linkedAt = new Date(session.linkedAt);
      const now = new Date();
      const diffMs = now - linkedAt;

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      let duration = '';
      if (days > 0) duration += `${days} ngày `;
      if (hours > 0) duration += `${hours} giờ `;
      duration += `${minutes} phút`;

      return msg.reply(
        `📋 **Thông tin tài khoản**\n` +
        `👤 Discord: **${session.discordUsername}**\n` +
        `🌐 MyMirai: **${session.miraiUsername || 'Không rõ'}**\n` +
        `🕐 Đăng nhập lúc: **${linkedAt.toLocaleString('vi-VN')}**\n` +
        `⏱️ Thời gian đã đăng nhập: **${duration}**\n` +
        `🔧 Prefix hiện tại: \`${prefix}\``
      );
    }
  },
};
