const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Tạm dừng nhạc'),
  async execute(interaction) { return handleMusicSlash(interaction, 'pause'); },
};
