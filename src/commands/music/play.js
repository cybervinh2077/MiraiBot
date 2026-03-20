const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Phát nhạc hoặc thêm vào queue')
    .addStringOption(opt => opt.setName('query').setDescription('Tên bài hát hoặc URL YouTube').setRequired(true)),
  async execute(interaction) { return handleMusicSlash(interaction, 'play'); },
};
