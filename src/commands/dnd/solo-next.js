const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { generateEncounter, aiMinionAction, roll1d20, statMod, checkLevelUp, avgPartyLevel } = require('../../dnd/lib/gameLogic');
const { CHANNELS } = require('../../dnd/static/channels');
const crypto = require('crypto');

function buildCombatEmbed(state, narrative, extra = '') {
  const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
  const aliveEnemies = state.combat.enemies.filter(e => e.hp.current > 0);
  const currentTurnEntry = state.combat.turnOrder[state.combat.currentTurn];

  const embed = new EmbedBuilder()
    .setColor(0xf72585)
    .setTitle(`⚔️ Channel ${state.campaign.currentChannel} – ${ch.name}`)
    .setDescription('━━━━━━━━━━━━━━━━━━━━\n' + narrative + (extra ? '\n\n' + extra : '') + '\n━━━━━━━━━━━━━━━━━━━━')
    .addFields(
      { name: '👾 Enemies', value: aliveEnemies.length ? aliveEnemies.map(e => `${e.name} HP${e.hp.current}/${e.hp.max}`).join(' | ') : '✅ All defeated!', inline: false },
      { name: '📡 Signal', value: `${state.campaign.signal.current}/20`, inline: true },
    );

  if (currentTurnEntry) {
    embed.addFields({ name: '🎯 Current Turn', value: `**${currentTurnEntry.name}**`, inline: true });
  }

  return embed;
}

async function processAIAndEnemyTurns(state, logs) {
  while (state.combat.active) {
    const entry = state.combat.turnOrder[state.combat.currentTurn];
    if (!entry) break;

    const isEnemy = entry.type === 'enemy';
    const isAI = entry.type === 'ai';
    const isPlayer = entry.type === 'player';

    if (isPlayer) break; // Stop and wait for player

    if (isAI) {
      const minion = state.party.find(p => p.id === entry.id);
      if (minion && minion.hp.current > 0) {
        const result = aiMinionAction(minion, state.combat.enemies, state);
        logs.push(result.narrative);
      }
    } else if (isEnemy) {
      const enemy = state.combat.enemies.find(e => e.id === entry.id);
      if (enemy && enemy.hp.current > 0) {
        const targets = state.party.filter(p => p.hp.current > 0);
        if (targets.length) {
          const target = targets[crypto.randomInt(0, targets.length)];
          const dmg = crypto.randomInt(3, 10);
          target.hp.current = Math.max(0, target.hp.current - dmg);
          logs.push(`👾 **${enemy.name}** tấn công **${target.name}**! ${dmg} damage! (HP: ${target.hp.current}/${target.hp.max})`);
        }
      }
    }

    // Advance turn
    state.combat.currentTurn = (state.combat.currentTurn + 1) % state.combat.turnOrder.length;

    // Check win
    const aliveEnemies = state.combat.enemies.filter(e => e.hp.current > 0);
    if (!aliveEnemies.length) {
      state.combat.active = false;
      state.campaign.phase = 'exploration';
      const xpGain = state.combat.enemies.reduce((a, e) => a + (e.xpReward || 0), 0);
      state.party.forEach(p => {
        p.xp = (p.xp || 0) + Math.floor(xpGain / state.party.length);
        p._lastXpGain = Math.floor(xpGain / state.party.length);
        checkLevelUp(p);
      });
      logs.push(`\n✅ **Victory!** +${xpGain} XP distributed!`);
      break;
    }

    // Check lose
    const player = state.party.find(p => !p.aiControlled);
    if (player && player.hp.current <= 0) {
      state.combat.active = false;
      state.campaign.phase = 'exploration';
      player.hp.current = Math.floor(player.hp.max * 0.5);
      if (!player.statusEffects) player.statusEffects = [];
      player.statusEffects.push({ id: 'deja-vu', name: 'Déjà Vu (disadvantage all rolls)', duration: 2 });
      logs.push(`\n💀 **Episode Canceled...** Bạn tỉnh lại với HP ${player.hp.current}/${player.hp.max} và debuff Déjà Vu.`);
      break;
    }
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solo-next')
    .setDescription('Tiến đến lượt tiếp theo trong solo mode'),
  async execute(interaction) {
    await interaction.deferReply();
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.editReply('❌ Chưa có campaign.');
    if (state.mode !== 'solo') return interaction.editReply('❌ Không ở solo mode.');
    if (state.soloPlayer !== interaction.user.id) return interaction.editReply('❌ Chỉ solo player mới dùng được.');

    const logs = [];
    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];

    if (state.campaign.phase === 'exploration') {
      // Generate encounter
      const playerLevel = avgPartyLevel(state.party);
      const encounter = generateEncounter(state.campaign.currentChannel, playerLevel);
      state.combat.enemies = encounter.enemies;
      state.combat.active = true;
      state.campaign.phase = 'combat';
      logs.push(encounter.narrative);

      // Roll init for all
      const allCombatants = [
        ...state.party.map(p => ({
          id: p.id, name: p.name,
          initiative: roll1d20() + statMod(p.stats.dex),
          type: p.aiControlled ? 'ai' : 'player',
          userId: p.userId,
        })),
        ...encounter.enemies.map(e => ({
          id: e.id, name: e.name,
          initiative: roll1d20(),
          type: 'enemy',
        })),
      ].sort((a, b) => b.initiative - a.initiative);

      state.combat.turnOrder = allCombatants;
      state.combat.currentTurn = 0;

      const initText = allCombatants.map(c => `${c.name}(${c.initiative})`).join(' > ');
      logs.push(`\n🎲 **Initiative:** ${initText}`);

      // Process AI/enemy turns until player turn
      await processAIAndEnemyTurns(state, logs);
    } else if (state.campaign.phase === 'combat') {
      // Advance from player's last turn
      state.combat.currentTurn = (state.combat.currentTurn + 1) % state.combat.turnOrder.length;
      await processAIAndEnemyTurns(state, logs);
    }

    await saveState(interaction.guild.id, state);

    const player = state.party.find(p => !p.aiControlled);
    const isPlayerTurn = state.combat.active &&
      state.combat.turnOrder[state.combat.currentTurn]?.type === 'player';

    const extra = isPlayerTurn
      ? `🎯 **Lượt của bạn!** (${player?.name} – HP ${player?.hp.current}/${player?.hp.max})\nDùng \`/action\` để tấn công!`
      : state.combat.active ? '⏳ Đang xử lý...' : '🗺️ Exploration mode. Dùng `/solo-next` để tiếp tục hoặc `/solo-quest` để advance.';

    const embed = buildCombatEmbed(state, logs.join('\n'), extra);
    await interaction.editReply({ embeds: [embed] });
  },
};
