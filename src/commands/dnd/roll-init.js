const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { roll1d20, statMod } = require('../../dnd/lib/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll-init')
    .setDescription('Roll initiative')
    .addStringOption(o => o.setName('modifier').setDescription('Stat modifier').setRequired(false)
      .addChoices({ name: 'DEX (default)', value: 'dex' }, { name: 'INT', value: 'int' })),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const userId = interaction.user.id;
    const member = state.party.find(p => p.userId === userId);
    if (!member) return interaction.reply({ content: '❌ Bạn chưa có nhân vật.', ephemeral: true });

    const modStat = interaction.options.getString('modifier') || 'dex';
    const mod = statMod(member.stats[modStat]);
    const roll = roll1d20();
    const total = roll + mod;

    // Lưu vào turnOrder nếu combat active
    if (state.combat.active) {
      const existing = state.combat.turnOrder.findIndex(t => t.id === member.id);
      const entry = { id: member.id, name: member.name, initiative: total, userId };
      if (existing >= 0) state.combat.turnOrder[existing] = entry;
      else state.combat.turnOrder.push(entry);
      state.combat.turnOrder.sort((a, b) => b.initiative - a.initiative);
      await saveState(interaction.guild.id, state);
    }

    const embed = new EmbedBuilder()
      .setColor(0xf72585)
      .setTitle('⚔️ Initiative Roll')
      .addFields(
        { name: '🎲 Roll', value: `1d20 = **${roll}**`, inline: true },
        { name: `📊 ${modStat.toUpperCase()} Mod`, value: `**${mod >= 0 ? '+' : ''}${mod}**`, inline: true },
        { name: '🏆 Total', value: `**${total}**`, inline: true },
      )
      .setFooter({ text: `${member.name} — ${state.combat.active ? 'Added to turn order' : 'Combat not active'}` });

    await interaction.reply({ embeds: [embed] });
  },
};
