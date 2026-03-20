const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Lấy lời bài hát đang phát hoặc theo tên')
    .addStringOption(opt => opt.setName('title').setDescription('Tên bài hát (để trống = bài đang phát)').setRequired(false)),
  async execute(interaction) { return handleMusicSlash(interaction, 'lyrics'); },
};
