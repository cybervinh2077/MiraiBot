const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createFreshState, saveState } = require('../../dnd/lib/gameData');
const { CHANNELS } = require('../../dnd/static/channels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start-campaign')
    .setDescription('Bắt đầu campaign Echoes of the Forgotten Broadcast'),
  async execute(interaction) {
    const state = createFreshState(interaction.guild.id);
    await saveState(interaction.guild.id, state);

    const ch = CHANNELS[1];
    const embed = new EmbedBuilder()
      .setColor(0x00b4d8)
      .setTitle('📺 Echoes of the Forgotten Broadcast')
      .setDescription('Campaign đã bắt đầu! Thế giới bị kẹt trong vòng lặp broadcast vô tận...')
      .addFields(
        { name: '📡 Signal', value: '`10/20` [██████████░░░░░░░░░░]', inline: true },
        { name: `${ch.emoji} Channel`, value: `**${ch.name}**`, inline: true },
        { name: '⚔️ Phase', value: 'Exploration', inline: true },
        { name: '👥 Party', value: 'Chưa có ai. Dùng `/assign-char` để chọn nhân vật!', inline: false },
        { name: '📋 Hướng dẫn', value: '1. `/assign-char` — chọn nhân vật\n2. `/party-status` — xem party\n3. `/roll-signal` — roll tín hiệu\n4. `/action` — hành động trong combat', inline: false },
      )
      .setFooter({ text: 'Mode: Multiplayer | Dùng /solo-start để chơi solo' });

    await interaction.reply({ embeds: [embed] });
  },
};
