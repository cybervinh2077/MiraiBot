const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState } = require('../../dnd/lib/gameData');

function progressBar(current, goal) {
  const filled = Math.round((current / goal) * 5);
  return '[' + '█'.repeat(filled) + '░'.repeat(5 - filled) + `] ${current}/${goal}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest-log')
    .setDescription('Xem danh sách quest'),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const mainText = state.quests.main.map(q =>
      `${q.complete ? '✅' : '⬜'} **${q.name}** — ${q.xp} XP`
    ).join('\n');

    const sideText = state.quests.side.map(q =>
      `${q.complete ? '✅' : progressBar(q.progress, q.goal)} **${q.name}** — ${q.xp} XP`
    ).join('\n');

    const earnedXP = [
      ...state.quests.main.filter(q => q.complete).map(q => q.xp),
      ...state.quests.side.filter(q => q.complete).map(q => q.xp),
    ].reduce((a, b) => a + b, 0);

    const embed = new EmbedBuilder()
      .setColor(0x7209b7)
      .setTitle('📋 Quest Log')
      .addFields(
        { name: '⚔️ Main Quests', value: mainText || 'Không có', inline: false },
        { name: '📌 Side Quests', value: sideText || 'Không có', inline: false },
        { name: '🏆 Total XP Earned', value: `**${earnedXP} XP**`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
