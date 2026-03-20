const { SlashCommandBuilder } = require('discord.js');
const { getPrefix } = require('../../utils/guildAuth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiện danh sách lệnh MiraiBot'),
  async execute(interaction) {
    const prefix = getPrefix(interaction.guild.id);
    interaction.reply({
      content: [
        '📖 **Danh sách lệnh MiraiBot**',
        '',
        '**🔐 Tài khoản** — `/login` `/logout` `/info` `/prefix`',
        '',
        '**🎵 Nhạc**',
        `\`${prefix}play\` \`/play\` — Phát nhạc hoặc thêm vào queue`,
        `\`${prefix}skip\` \`/skip\` — Bỏ qua bài hiện tại`,
        `\`${prefix}stop\` \`/stop\` — Dừng nhạc và xóa queue`,
        `\`${prefix}pause\` \`/pause\` — Tạm dừng`,
        `\`${prefix}resume\` \`/resume\` — Tiếp tục phát`,
        `\`${prefix}queue\` \`/queue\` — Xem danh sách queue`,
        `\`${prefix}nowplaying\` \`/nowplaying\` — Xem bài đang phát`,
        `\`${prefix}volume <0-200>\` \`/volume\` — Chỉnh âm lượng`,
        `\`${prefix}loop\` \`/loop\` — Loop bài / queue`,
        `\`${prefix}shuffle\` \`/shuffle\` — Shuffle queue`,
        `\`${prefix}lyrics\` \`/lyrics\` — Lời bài hát`,
        `\`${prefix}leave\` \`/leave\` — Bot rời kênh voice`,
        '',
        '**🛠️ Khác** — `/ping` `/help`',
        '',
        '**🎲 D&D** — `/start-campaign` `/assign-char` `/party-status` `/action` và nhiều hơn',
      ].join('\n'),
      ephemeral: false,
    });
  },
};
