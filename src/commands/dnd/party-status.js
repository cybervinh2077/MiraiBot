const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState } = require('../../dnd/lib/gameData');
const { calculateLevel } = require('../../dnd/lib/gameLogic');
const { CHANNELS } = require('../../dnd/static/channels');

function hpBar(current, max) {
  const filled = Math.round((current / max) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${current}/${max}`;
}

function signalBar(current, max) {
  const filled = Math.round((current / max) * 20);
  return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + `] ${current}/${max}`;
}

function xpBar(xp) {
  const { level, xpCurrent, xpForNext, progress } = calculateLevel(xp);
  const filled = Math.round(progress / 10);
  const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
  return `Lv${level} [${bar}] ${xpCurrent}/${xpForNext || 'MAX'} XP`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('party-status')
    .setDescription('Xem trạng thái party'),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
    const embed = new EmbedBuilder()
      .setColor(0x4361ee)
      .setTitle('👥 Party Status')
      .addFields(
        { name: `${ch.emoji} Channel`, value: `**${ch.name}**`, inline: true },
        { name: '⚔️ Phase', value: state.campaign.phase, inline: true },
        { name: '📡 Signal', value: signalBar(state.campaign.signal.current, state.campaign.signal.max), inline: false },
      );

    if (!state.party.length) {
      embed.addFields({ name: '👥 Party', value: 'Trống. Dùng `/assign-char` để tham gia!', inline: false });
    } else {
      for (const p of state.party) {
        const tag = p.aiControlled ? '🤖' : '🎮';
        embed.addFields({
          name: `${tag} ${p.name} ${p.aiControlled ? '' : `(@${p.username})`}`,
          value: `❤️ \`${hpBar(p.hp.current, p.hp.max)}\`\n⚡ Charges: ${p.charges.current}/${p.charges.max} | ${xpBar(p.xp)}`,
          inline: false,
        });
      }
    }

    embed.setFooter({ text: `Mode: ${state.mode} | Last updated: ${new Date(state.updatedAt).toLocaleString('vi-VN')}` });
    await interaction.reply({ embeds: [embed] });
  },
};
