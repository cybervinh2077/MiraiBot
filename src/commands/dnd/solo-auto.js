const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { generateEncounter, aiMinionAction, roll1d20, statMod, checkLevelUp, avgPartyLevel, rollDice } = require('../../dnd/lib/gameLogic');
const { CHANNELS } = require('../../dnd/static/channels');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solo-auto')
    .setDescription('Toggle auto-combat mode')
    .addBooleanOption(o => o.setName('enable').setDescription('Bật/tắt auto-combat').setRequired(true)),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });
    if (state.mode !== 'solo') return interaction.reply({ content: '❌ Không ở solo mode.', ephemeral: true });
    if (state.soloPlayer !== interaction.user.id) return interaction.reply({ content: '❌ Chỉ solo player mới dùng được.', ephemeral: true });

    const enable = interaction.options.getBoolean('enable');
    state.autoCombat = enable;
    await saveState(interaction.guild.id, state);

    if (!enable) {
      return interaction.reply({ content: '⏸️ **Auto-Combat OFF.** Bạn tự điều khiển lại.', ephemeral: false });
    }

    await interaction.deferReply();

    // Run full auto combat
    const logs = [];
    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
    const playerLevel = avgPartyLevel(state.party);
    const encounter = generateEncounter(state.campaign.currentChannel, playerLevel);

    state.combat.enemies = encounter.enemies;
    state.combat.active = true;
    state.campaign.phase = 'combat';
    logs.push(`⚡ **Auto-Combat ON**\n${encounter.narrative}\n`);

    // Full combat simulation
    let round = 0;
    while (state.combat.active && round < 20) {
      round++;
      logs.push(`\n**Round ${round}:**`);

      // All party attacks
      for (const p of state.party) {
        if (p.hp.current <= 0) continue;
        const aliveEnemies = state.combat.enemies.filter(e => e.hp.current > 0);
        if (!aliveEnemies.length) break;
        const result = aiMinionAction(p, aliveEnemies, state);
        logs.push(result.narrative);
      }

      // All enemies attack
      const aliveEnemies = state.combat.enemies.filter(e => e.hp.current > 0);
      for (const e of aliveEnemies) {
        const targets = state.party.filter(p => p.hp.current > 0);
        if (!targets.length) break;
        const target = targets[crypto.randomInt(0, targets.length)];
        const dmg = crypto.randomInt(3, 10);
        target.hp.current = Math.max(0, target.hp.current - dmg);
        logs.push(`👾 ${e.name} → ${target.name}: ${dmg} dmg (HP ${target.hp.current}/${target.hp.max})`);
      }

      // Check win/lose
      if (!state.combat.enemies.filter(e => e.hp.current > 0).length) {
        state.combat.active = false;
        state.campaign.phase = 'exploration';
        const xpGain = state.combat.enemies.reduce((a, e) => a + (e.xpReward || 0), 0);
        state.party.forEach(p => { p.xp = (p.xp || 0) + Math.floor(xpGain / state.party.length); checkLevelUp(p); });
        logs.push(`\n✅ **Victory in ${round} rounds!** +${xpGain} XP!`);
        break;
      }

      const player = state.party.find(p => !p.aiControlled);
      if (player?.hp.current <= 0) {
        state.combat.active = false;
        state.campaign.phase = 'exploration';
        player.hp.current = Math.floor(player.hp.max * 0.5);
        logs.push(`\n💀 **Defeated after ${round} rounds.** Respawn với HP ${player.hp.current}.`);
        break;
      }
    }

    state.autoCombat = false;
    await saveState(interaction.guild.id, state);

    // Split log if too long
    const fullLog = logs.join('\n');
    const chunks = [];
    for (let i = 0; i < fullLog.length; i += 1800) chunks.push(fullLog.slice(i, i + 1800));

    const embed = new EmbedBuilder()
      .setColor(0xf72585)
      .setTitle(`⚡ Auto-Combat — Channel ${state.campaign.currentChannel}: ${ch.name}`)
      .setDescription(chunks[0]);

    await interaction.editReply({ embeds: [embed] });
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i] });
    }
  },
};
