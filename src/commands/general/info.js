const { SlashCommandBuilder } = require('discord.js');
const { isGuildAuthed, getGuildAuth, getPrefix } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Xem thông tin tài khoản đã liên kết'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isGuildAuthed(guildId)) return interaction.reply({ content: t(guildId, 'info_no_login'), ephemeral: true });
    const session = getGuildAuth(guildId);
    const linkedAt = new Date(session.linkedAt);
    const diffMs = Date.now() - linkedAt;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    let duration = '';
    if (days > 0) duration += t(guildId, 'duration_days', { d: days });
    if (hours > 0) duration += t(guildId, 'duration_hours', { h: hours });
    duration += t(guildId, 'duration_minutes', { m: minutes });
    const prefix = getPrefix(guildId);
    interaction.reply({
      content: [
        t(guildId, 'info_title'),
        t(guildId, 'info_discord', { user: session.discordUsername }),
        t(guildId, 'info_mirai', { user: session.miraiUsername || '?' }),
        t(guildId, 'info_linked_at', { time: linkedAt.toLocaleString('vi-VN') }),
        t(guildId, 'info_duration', { duration }),
        t(guildId, 'info_prefix', { prefix }),
      ].join('\n'),
      ephemeral: true,
    });
  },
};
