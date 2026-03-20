const { SlashCommandBuilder } = require('discord.js');
const { getPrefix } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');
const { buildHelpEmbed } = require('./helpBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiện danh sách lệnh MiraiBot'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const prefix = getPrefix(guildId);
    const embed = buildHelpEmbed(prefix, guildId);

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: t(guildId, 'help_dm_sent'), ephemeral: true });
    } catch {
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
