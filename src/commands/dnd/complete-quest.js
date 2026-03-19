const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { checkLevelUp } = require('../../dnd/lib/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('complete-quest')
    .setDescription('Hoàn thành quest và nhận XP')
    .addStringOption(o => o.setName('quest_id').setDescription('ID quest (q1-q8, s1-s3)').setRequired(true)),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const questId = interaction.options.getString('quest_id');
    const quest = [...state.quests.main, ...state.quests.side].find(q => q.id === questId);
    if (!quest) return interaction.reply({ content: `❌ Không tìm thấy quest \`${questId}\`.`, ephemeral: true });
    if (quest.complete) return interaction.reply({ content: '❌ Quest này đã hoàn thành rồi.', ephemeral: true });

    quest.complete = true;
    const xpEach = Math.floor(quest.xp / Math.max(1, state.party.filter(p => !p.aiControlled).length));
    const levelUps = [];

    for (const p of state.party) {
      p.xp = (p.xp || 0) + xpEach;
      p._lastXpGain = xpEach;
      const result = checkLevelUp(p);
      if (result.leveled) levelUps.push({ name: p.name, ...result });
    }

    await saveState(interaction.guild.id, state);

    const embed = new EmbedBuilder()
      .setColor(0x06d6a0)
      .setTitle(`✅ Quest Complete: ${quest.name}`)
      .addFields(
        { name: '🏆 XP Reward', value: `**${quest.xp} XP** total (${xpEach} mỗi người)`, inline: false },
      );

    if (levelUps.length) {
      embed.addFields({
        name: '🎉 Level Up!',
        value: levelUps.map(l => `**${l.name}** Lv${l.oldLevel} → Lv${l.newLevel} (+${l.hpIncrease} HP)`).join('\n'),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
