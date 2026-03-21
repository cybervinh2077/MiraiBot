const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLevels } = require('../../utils/levelStorage');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 most active members in this server'),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId   = interaction.guild.id;
    const all       = loadLevels();
    const guildData = all[guildId] || {};

    const entries = Object.entries(guildData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10);

    if (entries.length === 0) {
      return interaction.editReply({ content: '📭 Chưa có dữ liệu level cho server này.' });
    }

    const lines = await Promise.all(
      entries.map(async ([userId, data], i) => {
        const rank   = MEDALS[i] ?? `**#${i + 1}**`;
        let display  = `<@${userId}>`;
        try {
          const member = await interaction.guild.members.fetch(userId);
          display = `${member.user.tag}`;
        } catch {}
        return `${rank} ${display} — Level **${data.level}** (${data.xp} XP)`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${interaction.guild.name} — Leaderboard`)
      .setDescription(lines.join('\n'))
      .setColor(0xffd700)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .setFooter({ text: `Top ${entries.length} members` });

    await interaction.editReply({ embeds: [embed] });
  },
};
