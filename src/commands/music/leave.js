const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('leave').setDescription('Bot rời kênh voice'),
  async execute(interaction) { return handleMusicSlash(interaction, 'leave'); },
};
