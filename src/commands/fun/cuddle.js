const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed, checkCooldown, fetchGif } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cuddle')
    .setDescription('Nằm cuộn tròn với ai đó 🥰')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn cuddle').setRequired(false)
    ),
  async execute(interaction) {
    const cd = checkCooldown(interaction.user.id, 'cuddle');
    if (cd) return interaction.reply({ content: `⏳ Chờ **${cd}s** nữa nhé!`, ephemeral: true });

    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const gif = await fetchGif('cuddle');

    const text = (!target || target.id === interaction.user.id)
      ? `**${interaction.user.displayName}** cuộn tròn một mình... 🥺`
      : `**${interaction.user.displayName}** cuddle với **${target.displayName}**! 🥰`;

    interaction.editReply({ embeds: [buildEmbed(text, gif)] });
  },
};
