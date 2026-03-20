const { SlashCommandBuilder } = require('discord.js');
const { runKiss } = require('./funHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kiss')
    .setDescription('Hôn ai đó 💋')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Người bạn muốn hôn').setRequired(false)
    ),
  execute: runKiss,
};
