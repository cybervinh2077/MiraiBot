const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Tự động tìm và phát nhạc liên tục theo chủ đề, thể loại hoặc nghệ sĩ')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Chủ đề / thể loại / nghệ sĩ (vd: lofi chill, EDM, Sơn Tùng...) hoặc "off" để tắt')
        .setRequired(true)),
  async execute(interaction) { return handleMusicSlash(interaction, 'autoplay'); },
};
