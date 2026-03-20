const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Tiếp tục phát nhạc'),
  async execute(interaction) { return handleMusicSlash(interaction, 'resume'); },
};
