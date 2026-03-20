const { SlashCommandBuilder } = require('discord.js');
const { runHug } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hug')
    .setDescription('Ôm ai đó 🤗')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn ôm').setRequired(false)
    ),
  execute: runHug,
};
