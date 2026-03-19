const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { rollDice, statMod } = require('../../dnd/lib/gameLogic');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('action')
    .setDescription('Dùng ability của nhân vật')
    .addStringOption(o => o.setName('ability').setDescription('Ability').setRequired(true)
      .addChoices(
        { name: 'Slash Burst (Kai)', value: 'slash-burst' },
        { name: 'Glitch Bolt (Miko)', value: 'glitch-bolt' },
        { name: 'Ad Trap (Reno)', value: 'ad-trap' },
        { name: 'Soundwave AoE (DJ)', value: 'soundwave' },
      )),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const userId = interaction.user.id;
    const member = state.party.find(p => p.userId === userId);
    if (!member) return interaction.reply({ content: '❌ Bạn chưa có nhân vật.', ephemeral: true });

    const abilityId = interaction.options.getString('ability');
    if (member.ability.id !== abilityId) {
      return interaction.reply({ content: `❌ Ability này không phải của **${member.name}**.`, ephemeral: true });
    }
    if (member.charges.current <= 0) {
      return interaction.reply({ content: '❌ Hết charges! Cần rest để hồi phục.', ephemeral: true });
    }

    member.charges.current--;
    const dmgResult = rollDice(member.ability.dice);
    let bonus = 0;
    if (member.ability.addStat) bonus = statMod(member.stats[member.ability.addStat]);

    // Check buff
    let buffDmg = 0;
    const buffIdx = (member.statusEffects || []).findIndex(e => e.id === 'signal-buff');
    if (buffIdx >= 0) {
      const buffRoll = rollDice('1d6');
      buffDmg = buffRoll.total;
      member.statusEffects.splice(buffIdx, 1);
    }

    const totalDmg = dmgResult.total + bonus + buffDmg;

    // Apply to enemy if combat active
    let targetText = 'No target';
    if (state.combat.active && state.combat.enemies.length) {
      const target = state.combat.enemies.find(e => e.hp.current > 0);
      if (target) {
        target.hp.current = Math.max(0, target.hp.current - totalDmg);
        targetText = `${target.name} — HP: ${target.hp.current}/${target.hp.max}`;
      }
    }

    await saveState(interaction.guild.id, state);

    const embed = new EmbedBuilder()
      .setColor(0xf72585)
      .setTitle(`⚔️ ${member.ability.name}`)
      .addFields(
        { name: '🎲 Damage Roll', value: `${member.ability.dice} = [${dmgResult.rolls.join(', ')}]${bonus ? ` +${bonus}` : ''}`, inline: false },
        { name: buffDmg ? '✨ Buff Bonus' : '⚡ Damage', value: buffDmg ? `+${buffDmg} (signal buff)` : '\u200b', inline: buffDmg > 0 },
        { name: '💥 Total', value: `**${totalDmg} ${member.ability.type} damage**`, inline: true },
        { name: '🎯 Target', value: targetText, inline: false },
        { name: '⚡ Charges', value: `${member.charges.current}/${member.charges.max}`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
