const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { checkLevelUp } = require('../../dnd/lib/gameLogic');
const { CHANNELS } = require('../../dnd/static/channels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solo-quest')
    .setDescription('Advance đến quest/channel cụ thể')
    .addStringOption(o => o.setName('quest_id').setDescription('Quest ID (q1-q8) hoặc channel number (1-13)').setRequired(true)),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });
    if (state.mode !== 'solo') return interaction.reply({ content: '❌ Không ở solo mode.', ephemeral: true });
    if (state.soloPlayer !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ solo player mới dùng được.', ephemeral: true });

    const input = interaction.options.getString('quest_id');
    const channelNum = parseInt(input);
    const isChannelJump = !isNaN(channelNum) && channelNum >= 1 && channelNum <= 13;

    const skipped = [];
    let totalXP = 0;

    if (isChannelJump) {
      const from = state.campaign.currentChannel;
      for (let i = from; i < channelNum; i++) {
        const ch = CHANNELS[i];
        if (ch) skipped.push(ch.name);
        // Mark related quests complete at 50% XP
        const related = state.quests.main.filter(q => !q.complete);
        if (related.length && i <= related.length) {
          const q = related[0];
          q.complete = true;
          const partial = Math.floor(q.xp * 0.5);
          totalXP += partial;
        }
      }
      state.campaign.currentChannel = channelNum;
    } else {
      const quest = [...state.quests.main, ...state.quests.side].find(q => q.id === input);
      if (!quest) return interaction.reply({ content: `❌ Không tìm thấy quest \`${input}\`.`, ephemeral: true });
      if (!quest.complete) {
        quest.complete = true;
        totalXP = Math.floor(quest.xp * 0.5);
        skipped.push(quest.name);
      }
    }

    if (totalXP > 0) {
      state.party.forEach(p => {
        p.xp = (p.xp || 0) + Math.floor(totalXP / state.party.length);
        p._lastXpGain = Math.floor(totalXP / state.party.length);
        checkLevelUp(p);
      });
    }

    state.campaign.phase = 'exploration';
    await saveState(interaction.guild.id, state);

    const newCh = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
    const embed = new EmbedBuilder()
      .setColor(0x7209b7)
      .setTitle('⏩ Time Skip')
      .setDescription(skipped.length ? `Bạn lướt nhanh qua: **${skipped.join(' → ')}**` : 'Không có gì để skip.')
      .addFields(
        { name: '📺 Now at', value: `${newCh.emoji} **${newCh.name}**`, inline: true },
        { name: '🏆 XP (50%)', value: `+${totalXP}`, inline: true },
        { name: '💡 Tip', value: 'Dùng `/solo-next` để bắt đầu encounter mới!', inline: false },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
