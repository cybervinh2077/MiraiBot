const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CHARACTERS } = require('../../dnd/static/characters');
const { NPCS } = require('../../dnd/static/npcs');
const { statMod } = require('../../dnd/lib/gameLogic');

function statBlock(stats) {
  return Object.entries(stats).map(([k, v]) => {
    const mod = statMod(v);
    return `**${k.toUpperCase()}** ${v} (${mod >= 0 ? '+' : ''}${mod})`;
  }).join(' | ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stat')
    .setDescription('Xem stat block nhân vật hoặc NPC')
    .addStringOption(o => o.setName('target').setDescription('Target').setRequired(true)
      .addChoices(
        { name: 'Kai Static', value: 'kai' },
        { name: 'Miko Glitch', value: 'miko' },
        { name: 'Reno Skip', value: 'reno' },
        { name: 'DJ Volume', value: 'dj' },
        { name: 'Director Kuro (Boss)', value: 'director-kuro' },
        { name: 'TV God (Final Boss)', value: 'tv-god' },
      )),
  async execute(interaction) {
    const target = interaction.options.getString('target');
    const char = CHARACTERS[target] || NPCS[target];
    if (!char) return interaction.reply({ content: '❌ Không tìm thấy.', ephemeral: true });

    const isNpc = !!NPCS[target];
    const embed = new EmbedBuilder()
      .setColor(isNpc ? 0xef233c : 0x4361ee)
      .setTitle(`${isNpc ? '👹' : '🧑'} ${char.name}`)
      .addFields(
        { name: '📊 Stats', value: statBlock(char.stats), inline: false },
        { name: '❤️ HP', value: `${char.hp.current}/${char.hp.max}`, inline: true },
        { name: '🛡️ AC', value: `${char.ac || '—'}`, inline: true },
      );

    if (isNpc) {
      embed.addFields(
        { name: '⚠️ CR', value: `${char.cr}`, inline: true },
        { name: '🔰 Immunities', value: char.immunities.length ? char.immunities.join(', ') : 'None', inline: true },
        { name: '⚔️ Abilities', value: char.abilities.map(a => `**${a.name}** — ${a.dice} ${a.type}${a.saveDC ? ` (DC${a.saveDC} ${a.saveType})` : ''}`).join('\n'), inline: false },
        { name: '📖 Description', value: char.description, inline: false },
      );
    } else {
      embed.addFields(
        { name: '🎭 Kit', value: char.kit, inline: true },
        { name: '⚡ Charges', value: `${char.charges.current}/${char.charges.max}`, inline: true },
        { name: '⚔️ Ability', value: `**${char.ability.name}** — ${char.ability.dice} ${char.ability.type}`, inline: false },
        { name: '📖 Backstory', value: char.backstory, inline: false },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
