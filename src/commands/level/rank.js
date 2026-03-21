const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData } = require('../../utils/levelStorage');
const { getRequiredXp } = require('../../utils/leveling');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("View your or another user's level and XP")
    .addUserOption(o =>
      o.setName('user').setDescription('Target user (default: you)').setRequired(false)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser('user') || interaction.user;
    const guildId = interaction.guild.id;

    const { data: user } = getUserData(guildId, target.id);
    const required  = getRequiredXp(user.level);
    const remaining = Math.max(0, required - user.xp);

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const color  = member?.displayColor || 0x5865f2;

    const embed = new EmbedBuilder()
      .setTitle(`${target.displayName}'s Rank`)
      .setThumbnail(target.displayAvatarURL({ size: 256, dynamic: true }))
      .setColor(color)
      .addFields(
        { name: '🏆 Level',           value: `${user.level}`,    inline: true },
        { name: '✨ XP',              value: `${user.xp}`,       inline: true },
        { name: '📈 XP to next level', value: `${remaining}`,    inline: true },
      )
      .setFooter({ text: `XP needed for level ${user.level + 1}: ${required}` });

    await interaction.reply({ embeds: [embed] });
  },
};
