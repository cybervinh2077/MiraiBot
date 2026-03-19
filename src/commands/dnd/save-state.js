const { SlashCommandBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { CHANNELS } = require('../../dnd/static/channels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('save-state')
    .setDescription('Force save campaign state'),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    await saveState(interaction.guild.id, state);
    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];

    await interaction.reply({
      content: `💾 **Saved!** \`${new Date().toLocaleString('vi-VN')}\` — Party: ${state.party.length} members | Signal: ${state.campaign.signal.current}/20 | ${ch.emoji} Channel: ${ch.name}`,
    });
  },
};
