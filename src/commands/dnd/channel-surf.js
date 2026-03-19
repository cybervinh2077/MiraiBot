const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { roll1d20, statMod } = require('../../dnd/lib/gameLogic');
const { CHARACTERS } = require('../../dnd/static/characters');
const { CHANNELS } = require('../../dnd/static/channels');

const KIT_STATS = { samurai: 'str', witch: 'int', rogue: 'dex', bard: 'cha' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channel-surf')
    .setDescription('Đổi kit và roll initiative')
    .addStringOption(o => o.setName('kit').setDescription('Kit mới').setRequired(true)
      .addChoices(
        { name: 'Samurai', value: 'samurai' },
        { name: 'Witch', value: 'witch' },
        { name: 'Rogue', value: 'rogue' },
        { name: 'Bard', value: 'bard' },
      )),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign.', ephemeral: true });

    const userId = interaction.user.id;
    const member = state.party.find(p => p.userId === userId);
    if (!member) return interaction.reply({ content: '❌ Bạn chưa có nhân vật.', ephemeral: true });

    const newKit = interaction.options.getString('kit');
    const baseChar = Object.values(CHARACTERS).find(c => c.kit === newKit);
    if (!baseChar) return interaction.reply({ content: '❌ Kit không hợp lệ.', ephemeral: true });

    member.kit = newKit;
    member.stats = { ...baseChar.stats };
    member.ability = { ...baseChar.ability };

    const initStat = KIT_STATS[newKit] || 'dex';
    const roll = roll1d20();
    const mod = statMod(member.stats[initStat]);
    const total = roll + mod;

    const ch = CHANNELS[state.campaign.currentChannel] || CHANNELS[1];
    await saveState(interaction.guild.id, state);

    const embed = new EmbedBuilder()
      .setColor(0x4cc9f0)
      .setTitle(`📺 Channel Surf — ${member.name}`)
      .addFields(
        { name: '🎭 New Kit', value: `**${newKit}**`, inline: true },
        { name: '⚔️ New Ability', value: `**${member.ability.name}** (${member.ability.dice})`, inline: true },
        { name: '🎲 Initiative', value: `1d20(${roll}) + ${initStat.toUpperCase()}(${mod >= 0 ? '+' : ''}${mod}) = **${total}**`, inline: false },
        { name: `${ch.emoji} Current Channel`, value: ch.name, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
