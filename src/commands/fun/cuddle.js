const { SlashCommandBuilder } = require('discord.js');
const { buildEmbed, checkCooldown, fetchGif } = require('./funHelper');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cuddle')
    .setDescription('Nằm cuộn tròn với ai đó 🥰')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn cuddle').setRequired(false)
    ),
  async execute(interaction) {
    const g = interaction.guild.id;
    const cd = checkCooldown(interaction.user.id, 'cuddle');
    if (cd) return interaction.reply({ content: t(g, 'fun_cooldown', { sec: cd }), ephemeral: true });

    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const gif = await fetchGif('cuddle');
    const text = (!target || target.id === interaction.user.id)
      ? t(g, 'cuddle_self', { user: interaction.user.displayName })
      : t(g, 'cuddle_other', { user: interaction.user.displayName, target: target.displayName });
    interaction.editReply({ embeds: [buildEmbed(text, gif)] });
  },
};
