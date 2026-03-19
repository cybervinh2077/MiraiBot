const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { roll1d20, updateSignal } = require('../../dnd/lib/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll-signal')
    .setDescription('Toàn party roll signal — ảnh hưởng đến buff/debuff'),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });
    if (!state.party.length) return interaction.reply({ content: '❌ Party trống.', ephemeral: true });

    const rolls = state.party.map(p => ({ name: p.name, roll: roll1d20() }));
    const avg = Math.round(rolls.reduce((a, r) => a + r.roll, 0) / rolls.length);

    let delta = 0, effectText = '';
    if (avg >= 10) {
      delta = 1;
      effectText = '✨ **+1 Signal!** Buff: `+1d6 next attack` cho toàn party!';
      state.party.forEach(p => {
        if (!p.statusEffects) p.statusEffects = [];
        p.statusEffects.push({ id: 'signal-buff', name: '+1d6 next attack', duration: 1 });
      });
    } else if (avg < 5) {
      delta = -2;
      effectText = '📡 **-2 Signal!** Debuff: `static noise` — disadvantage lần roll tiếp theo!';
      state.party.forEach(p => {
        if (!p.statusEffects) p.statusEffects = [];
        p.statusEffects.push({ id: 'static-noise', name: 'static noise (disadvantage)', duration: 1 });
      });
    } else {
      delta = -1;
      effectText = '📻 **-1 Signal.** Tín hiệu yếu dần...';
    }

    const { newSignal } = updateSignal(state, delta);
    await saveState(interaction.guild.id, state);

    const embed = new EmbedBuilder()
      .setColor(avg >= 10 ? 0x06d6a0 : avg < 5 ? 0xef233c : 0xffd166)
      .setTitle('📡 Signal Roll')
      .addFields(
        ...rolls.map(r => ({ name: r.name, value: `🎲 **${r.roll}**`, inline: true })),
        { name: '📊 Average', value: `**${avg}**`, inline: false },
        { name: '⚡ Effect', value: effectText, inline: false },
        { name: '📡 Signal', value: `${newSignal}/20`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
