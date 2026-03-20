const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed, checkCooldown, fetchGif } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Ôm ai đó 🤗')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn ôm').setRequired(false)
    ),
  async execute(interaction) {
    const cd = checkCooldown(interaction.user.id, 'hug');
    if (cd) return interaction.reply({ content: `⏳ Chờ **${cd}s** nữa nhé!`, ephemeral: true });

    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const gif = await fetchGif('hug');

    const text = (!target || target.id === interaction.user.id)
      ? `**${interaction.user.displayName}** tự ôm bản thân... 🥺`
      : `**${interaction.user.displayName}** ôm **${target.displayName}**! 🤗`;

    interaction.editReply({ embeds: [buildEmbed(text, gif)] });
  },
};
