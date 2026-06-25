const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getLevelChannel, setLevelChannel } = require('../../utils/guildAuth');
const { t } = require('../../utils/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Cấu hình bot cho server (cần quyền Quản lý Máy chủ)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand(sub =>
      sub.setName('level-channel')
        .setDescription('Chọn channel nhận thông báo lên cấp (level-up)')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel văn bản để gửi thông báo level-up')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('level-off')
        .setDescription('Tắt channel riêng — thông báo level-up gửi tại nơi nhắn tin'))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Xem cấu hình hiện tại của server')),

  async execute(interaction) {
    const g = interaction.guild.id;

    // Bảo vệ kép: yêu cầu quyền Quản lý Máy chủ
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: t(g, 'setup_no_perm'), ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'level-channel') {
      const channel = interaction.options.getChannel('channel');
      setLevelChannel(g, channel.id);
      return interaction.reply({ content: t(g, 'setup_level_set', { channel: `<#${channel.id}>` }), ephemeral: true });
    }

    if (sub === 'level-off') {
      setLevelChannel(g, null);
      return interaction.reply({ content: t(g, 'setup_level_off'), ephemeral: true });
    }

    if (sub === 'status') {
      const channelId = getLevelChannel(g);
      const levelLine = channelId
        ? t(g, 'setup_status_level_on', { channel: `<#${channelId}>` })
        : t(g, 'setup_status_level_off');
      return interaction.reply({ content: `${t(g, 'setup_status_title')}\n${levelLine}`, ephemeral: true });
    }
  },
};
