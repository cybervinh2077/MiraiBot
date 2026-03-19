const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState } = require('../../dnd/lib/gameData');
const { CHANNELS } = require('../../dnd/static/channels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load-state')
    .setDescription('Load campaign state từ save file'),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Không tìm thấy save file.', ephemeral: true });

    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
    const partyText = state.party.length
      ? state.party.map(p => `${p.aiControlled ? '🤖' : '🎮'} ${p.name} (HP${p.hp.current}/${p.hp.max})`).join('\n')
      : 'Trống';

    const embed = new EmbedBuilder()
      .setColor(0x06d6a0)
      .setTitle('📂 Save Loaded')
      .setDescription('━━━━━━━━━━━━━━')
      .addFields(
        { name: '🎮 Mode', value: state.mode, inline: true },
        { name: `${ch.emoji} Channel`, value: `${state.campaign.currentChannel}: ${ch.name}`, inline: true },
        { name: '📡 Signal', value: `${state.campaign.signal.current}/20`, inline: true },
        { name: '👥 Party', value: partyText, inline: false },
        { name: '🕐 Last Saved', value: new Date(state.updatedAt).toLocaleString('vi-VN'), inline: false },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
