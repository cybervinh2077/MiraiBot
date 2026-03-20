const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed, checkCooldown, fetchGif } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('Hôn ai đó 💋')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn hôn').setRequired(false)
    ),
  async execute(interaction) {
    const cd = checkCooldown(interaction.user.id, 'kiss');
    if (cd) return interaction.reply({ content: `⏳ Chờ **${cd}s** nữa nhé!`, ephemeral: true });

    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const gif = await fetchGif('kiss');

    const text = (!target || target.id === interaction.user.id)
      ? `**${interaction.user.displayName}** thổi nụ hôn gió~ 💋`
      : `**${interaction.user.displayName}** hôn **${target.displayName}**! 💋`;

    interaction.editReply({ embeds: [buildEmbed(text, gif)] });
  },
};
