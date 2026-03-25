const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData } = require('../../utils/levelStorage');
const { getRequiredXp } = require('../../utils/leveling');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Xem level và XP của bạn hoặc người khác")
    .addUserOption(o =>
      o.setName('user').setDescription('Người dùng (mặc định: bạn)').setRequired(false)
    ),

  async execute(interaction) {
    const g       = interaction.guild.id;
    const target  = interaction.options.getUser('user') || interaction.user;
    const { data: user } = getUserData(g, target.id);
    const required  = getRequiredXp(user.level);
    const remaining = Math.max(0, required - user.xp);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const color  = member?.displayColor || 0x5865f2;

    const embed = new EmbedBuilder()
      .setTitle(t(g, 'rank_title', { user: target.displayName }))
      .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
      .setColor(color)
      .addFields(
        { name: t(g, 'rank_level'),   value: `${user.level}`,  inline: true },
        { name: t(g, 'rank_xp'),      value: `${user.xp}`,     inline: true },
        { name: t(g, 'rank_xp_next'), value: `${remaining}`,   inline: true },
      )
      .setFooter({ text: t(g, 'rank_footer', { level: user.level + 1, required }) });

    await interaction.reply({ embeds: [embed] });
  },
};
