const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua bài hiện tại'),
  async execute(interaction) { return handleMusicSlash(interaction, 'skip'); },
};
