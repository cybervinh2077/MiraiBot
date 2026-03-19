const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadState, saveState } = require('../../dnd/lib/gameData');
const { CHARACTERS } = require('../../dnd/static/characters');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign-char')
    .setDescription('Chọn nhân vật cho mình')
    .addStringOption(o => o.setName('character').setDescription('Nhân vật').setRequired(true)
      .addChoices(
        { name: 'Kai Static (Samurai)', value: 'kai' },
        { name: 'Miko Glitch (Witch)', value: 'miko' },
        { name: 'Reno Skip (Rogue)', value: 'reno' },
        { name: 'DJ Volume (Bard)', value: 'dj' },
      )),
  async execute(interaction) {
    const state = await loadState(interaction.guild.id);
    if (!state) return interaction.reply({ content: '❌ Chưa có campaign. Dùng `/start-campaign` trước.', ephemeral: true });

    const charId = interaction.options.getString('character');
    const userId = interaction.user.id;

    if (state.party.find(p => p.userId === userId)) {
      return interaction.reply({ content: '❌ Bạn đã có nhân vật rồi.', ephemeral: true });
    }
    if (state.party.find(p => p.id === charId)) {
      return interaction.reply({ content: `❌ **${CHARACTERS[charId].name}** đã được chọn bởi người khác.`, ephemeral: true });
    }

    const char = JSON.parse(JSON.stringify(CHARACTERS[charId]));
    char.userId = userId;
    char.username = interaction.user.username;
    state.party.push(char);
    await saveState(interaction.guild.id, state);

    const embed = new EmbedBuilder()
      .setColor(0x06d6a0)
      .setTitle(`✅ ${char.name} đã tham gia party!`)
      .addFields(
        { name: '🎭 Kit', value: char.kit, inline: true },
        { name: '❤️ HP', value: `${char.hp.current}/${char.hp.max}`, inline: true },
        { name: '⚡ Charges', value: `${char.charges.current}/${char.charges.max}`, inline: true },
        { name: '⚔️ Ability', value: `**${char.ability.name}** (${char.ability.dice} ${char.ability.type})`, inline: false },
        { name: '📖 Backstory', value: char.backstory, inline: false },
      )
      .setFooter({ text: `Assigned to ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  },
};
