const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Bật/tắt loop')
    .addStringOption(opt => opt.setName('mode').setDescription('Chế độ loop').setRequired(false)
      .addChoices({ name: 'Bài hiện tại', value: 'song' }, { name: 'Toàn bộ queue', value: 'queue' })),
  async execute(interaction) { return handleMusicSlash(interaction, 'loop'); },
};
