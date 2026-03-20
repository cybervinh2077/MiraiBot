const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Chỉnh âm lượng (0-200)')
    .addIntegerOption(opt => opt.setName('level').setDescription('Mức âm lượng 0-200').setRequired(true).setMinValue(0).setMaxValue(200)),
  async execute(interaction) { return handleMusicSlash(interaction, 'volume'); },
};
