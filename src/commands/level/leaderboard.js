const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLevels } = require('../../utils/levelStorage');
const { t } = require('../../utils/i18n');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Xem top 10 thành viên tích cực nhất server'),

  async execute(interaction) {
    await interaction.deferReply();
    const g = interaction.guild.id;
    const all       = loadLevels();
    const guildData = all[g] || {};

    const entries = Object.entries(guildData)
      .sort(([, a], [, b]) => b.xp - a.xp)
      .slice(0, 10);

    if (entries.length === 0) {
      return interaction.editReply({ content: t(g, 'leaderboard_empty') });
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
      .setTitle(t(g, 'leaderboard_title', { guild: interaction.guild.name }))
      .setDescription(lines.join('\n'))
      .setColor(0xffd700)
      .setThumbnail(interaction.guild.iconURL({ size: 256 }))
      .setFooter({ text: t(g, 'leaderboard_footer', { count: entries.length }) });

    await interaction.editReply({ embeds: [embed] });
  },
};
