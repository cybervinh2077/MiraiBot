const { SlashCommandBuilder } = require('discord.js');
const { handleMusicSlash } = require('../../handlers/musicHandler');
module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Xem danh sách queue'),
  async execute(interaction) { return handleMusicSlash(interaction, 'queue'); },
};
