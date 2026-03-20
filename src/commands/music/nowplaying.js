const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Xem bài đang phát'),
  async execute(interaction) { return handleMusicSlash(interaction, 'nowplaying'); },
};
