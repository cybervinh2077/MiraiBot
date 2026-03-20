const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Dừng nhạc và xóa queue'),
  async execute(interaction) { return handleMusicSlash(interaction, 'stop'); },
};
