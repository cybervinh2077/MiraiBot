const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, getGuildAuth, getPrefix } = require('../../utils/guildAuth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Xem thông tin tài khoản đã liên kết'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isGuildAuthed(guildId)) return interaction.reply({ content: '⚠️ Server chưa đăng nhập. Dùng `/login` để liên kết.', ephemeral: true });
    const session = getGuildAuth(guildId);
    const linkedAt = new Date(session.linkedAt);
    const diffMs = Date.now() - linkedAt;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    let duration = '';
    if (days > 0) duration += `${days} ngày `;
    if (hours > 0) duration += `${hours} giờ `;
    duration += `${minutes} phút`;
    const prefix = getPrefix(guildId);
    interaction.reply({
      content: `📋 **Thông tin tài khoản**\n👤 Discord: **${session.discordUsername}**\n🌐 MyMirai: **${session.miraiUsername || 'Không rõ'}**\n🕐 Đăng nhập lúc: **${linkedAt.toLocaleString('vi-VN')}**\n⏱️ Thời gian đã đăng nhập: **${duration}**\n🔧 Prefix hiện tại: \`${prefix}\``,
      ephemeral: true,
    });
  },
};
