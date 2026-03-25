const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, getGuildAuth, clearGuildAuth } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logout')
    .setDescription('Hủy liên kết tài khoản MyMirai (chỉ người đã đăng nhập)'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isGuildAuthed(guildId)) return interaction.reply({ content: t(guildId, 'logout_not_logged_in'), ephemeral: true });
    const session = getGuildAuth(guildId);
    if (interaction.user.id !== session.discordUserId) {
      return interaction.reply({ content: t(guildId, 'logout_only_owner', { user: session.discordUsername }), ephemeral: true });
    }
    clearGuildAuth(guildId);
    interaction.reply({ content: t(guildId, 'logout_done'), ephemeral: true });
  },
};
