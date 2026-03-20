const { SlashCommandBuilder } = require('discord.js');
const { runCuddle } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cuddle')
    .setDescription('Nằm cuộn tròn với ai đó 🥰')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn cuddle').setRequired(false)
    ),
  execute: runCuddle,
};
