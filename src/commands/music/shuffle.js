const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle queue'),
  async execute(interaction) { return handleMusicSlash(interaction, 'shuffle'); },
};
