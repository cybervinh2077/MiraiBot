const { SlashCommandBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const { buildHelpEmbeds } = require('./helpBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiện toàn bộ hướng dẫn sử dụng MiraiBot'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const embeds  = buildHelpEmbeds();

    try {
      // Discord DM giới hạn 10 embeds/message — chia 2 lần
      await interaction.user.send({ embeds: embeds.slice(0, 4) });
      await interaction.user.send({ embeds: embeds.slice(4) });
      await interaction.reply({ content: t(guildId, 'help_dm_sent'), ephemeral: true });
    } catch {
      // DM bị tắt — gửi từng embed vào channel (ephemeral)
      await interaction.reply({ embeds: [embeds[0]], ephemeral: true });
      for (const embed of embeds.slice(1)) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      }
    }
  },
};
