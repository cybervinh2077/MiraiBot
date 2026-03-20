const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, getGuildAuth, clearGuildAuth } = require('../../utils/guildAuth');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logout')
    .setDescription('Hủy liên kết tài khoản MyMirai (chỉ người đã đăng nhập)'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isGuildAuthed(guildId)) return interaction.reply({ content: '⚠️ Server chưa đăng nhập.', ephemeral: true });
    const session = getGuildAuth(guildId);
    if (interaction.user.id !== session.discordUserId) {
      return interaction.reply({ content: `❌ Chỉ **${session.discordUsername}** mới có thể logout.`, ephemeral: true });
    }
    clearGuildAuth(guildId);
    interaction.reply({ content: '👋 Đã logout thành công.', ephemeral: true });
  },
};
