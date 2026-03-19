const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createFreshState, saveState } = require('../../dnd/lib/gameData');
const { CHARACTERS } = require('../../dnd/static/characters');
const { generateAIMinion } = require('../../dnd/lib/gameLogic');
const { CHANNELS } = require('../../dnd/static/channels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('solo-start')
    .setDescription('Bắt đầu solo campaign')
    .addStringOption(o => o.setName('character').setDescription('Nhân vật của bạn').setRequired(true)
      .addChoices(
        { name: 'Kai Static (Samurai)', value: 'kai' },
        { name: 'Miko Glitch (Witch)', value: 'miko' },
        { name: 'Reno Skip (Rogue)', value: 'reno' },
        { name: 'DJ Volume (Bard)', value: 'dj' },
      )),
  async execute(interaction) {
    const charId = interaction.options.getString('character');
    const userId = interaction.user.id;

    const state = createFreshState(interaction.guild.id);
    state.mode = 'solo';
    state.soloPlayer = userId;

    const playerChar = JSON.parse(JSON.stringify(CHARACTERS[charId]));
    playerChar.userId = userId;
    playerChar.username = interaction.user.username;
    playerChar.isMinion = false;
    playerChar.aiControlled = false;

    const aiIds = Object.keys(CHARACTERS).filter(k => k !== charId);
    const aiMinions = aiIds.map(id => {
      const minion = generateAIMinion(CHARACTERS[id]);
      minion.userId = `ai_${id}`;
      return minion;
    });

    state.party = [playerChar, ...aiMinions];
    state.aiMinions = aiMinions.map(m => m.id);
    await saveState(interaction.guild.id, state);

    const ch = CHANNELS[1];
    const embed = new EmbedBuilder()
      .setColor(0x7209b7)
      .setTitle('📺 Solo Broadcast Activated!')
      .setDescription('━━━━━━━━━━━━━━━━━━━━')
      .addFields(
        { name: `🎮 You: ${playerChar.name}`, value: `HP ${playerChar.hp.current}/${playerChar.hp.max} | Charges ${playerChar.charges.current}`, inline: false },
        { name: '🤖 AI Party', value: aiMinions.map(m => `**${m.name}** (HP ${m.hp.current}/${m.hp.max}, Charges ${m.charges.current})`).join('\n'), inline: false },
        { name: '━━━━━━━━━━━━━━━━━━━━', value: `📡 Signal: **10/20** | ${ch.emoji} Channel 1: **${ch.name}**`, inline: false },
        { name: '💡 Tip', value: 'Dùng `/solo-next` để bắt đầu encounter!', inline: false },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
