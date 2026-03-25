const { SlashCommandBuilder } = require('discord.js');
const { getGuildAuth, getPrefix, setPrefix } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Đổi prefix lệnh (chỉ người đã đăng nhập)')
    .addStringOption(opt => opt.setName('prefix').setDescription('Prefix mới (tối đa 3 ký tự)').setRequired(true)),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const session = getGuildAuth(guildId);
    if (interaction.user.id !== session?.discordUserId) {
      return interaction.reply({ content: t(guildId, 'prefix_only_owner', { user: session?.discordUsername || '?' }), ephemeral: true });
    }
    const newPrefix = interaction.options.getString('prefix');
    if (newPrefix.length > 3) return interaction.reply({ content: t(guildId, 'prefix_max_len'), ephemeral: true });
    setPrefix(guildId, newPrefix);
    interaction.reply({ content: t(guildId, 'prefix_changed', { prefix: newPrefix }), ephemeral: true });
  },
};
