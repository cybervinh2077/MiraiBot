const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { t } = require('../../utils/i18n');
const api = require('../../gd/gdApi');
const { getDifficultyName, getLengthName, getModBadgeName } = require('../../gd/gdParser');
const { linkAccount, unlinkAccount, getLinkedAccount, getLinkedAccountsForGuild } = require('../../gd/gdAccount');
const { setNotifyConfig, removeNotifyConfig } = require('../../gd/gdNotifier');

const GD_COLOR   = 0x7b68ee;
const DEMON_COLOR = 0xff4444;

// ─── Slash command definition ─────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('gd')
    .setDescription('Geometry Dash commands')
    // /gd profile [username]
    .addSubcommand(s =>
      s.setName('profile').setDescription('Xem profile người chơi GD')
        .addStringOption(o => o.setName('username').setDescription('GD username (để trống = tài khoản đã link)').setRequired(false))
    )
    // /gd level <query>
    .addSubcommand(s =>
      s.setName('level').setDescription('Tìm kiếm level GD')
        .addStringOption(o => o.setName('query').setDescription('Tên level hoặc ID').setRequired(true))
    )
    // /gd daily
    .addSubcommand(s => s.setName('daily').setDescription('Xem Daily Level hiện tại'))
    // /gd weekly
    .addSubcommand(s => s.setName('weekly').setDescription('Xem Weekly Demon hiện tại'))
    // /gd leaderboard [type]
    .addSubcommand(s =>
      s.setName('leaderboard').setDescription('Bảng xếp hạng GD')
        .addStringOption(o =>
          o.setName('type').setDescription('Loại bảng xếp hạng').setRequired(false)
            .addChoices(
              { name: '⭐ Stars (Global)', value: 'top' },
              { name: '🏆 Creators',       value: 'creators' },
              { name: '🖥️ Server',          value: 'server' },
            )
        )
    )
    // /gd account link/unlink
    .addSubcommandGroup(g =>
      g.setName('account').setDescription('Liên kết tài khoản GD')
        .addSubcommand(s =>
          s.setName('link').setDescription('Link tài khoản GD của bạn')
            .addStringOption(o => o.setName('username').setDescription('GD username').setRequired(true))
        )
        .addSubcommand(s => s.setName('unlink').setDescription('Hủy link tài khoản GD'))
    )
    // /gd modlist
    .addSubcommand(s => s.setName('modlist').setDescription('Danh sách Moderator GD'))
    // /gd checkmod <username>
    .addSubcommand(s =>
      s.setName('checkmod').setDescription('Kiểm tra xem người chơi có phải Mod GD không')
        .addStringOption(o => o.setName('username').setDescription('GD username').setRequired(true))
    )
    // /gd notify setup/disable
    .addSubcommandGroup(g =>
      g.setName('notify').setDescription('Thông báo Daily/Weekly GD')
        .addSubcommand(s =>
          s.setName('setup').setDescription('Bật thông báo GD cho kênh này')
            .addBooleanOption(o => o.setName('daily').setDescription('Thông báo Daily Level').setRequired(false))
            .addBooleanOption(o => o.setName('weekly').setDescription('Thông báo Weekly Demon').setRequired(false))
        )
        .addSubcommand(s => s.setName('disable').setDescription('Tắt thông báo GD'))
    ),

  // ─── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction) {
    const g   = interaction.guild.id;
    const uid = interaction.user.id;
    const group = interaction.options.getSubcommandGroup(false);
    const sub   = interaction.options.getSubcommand();

    // Rate limit check
    if (!api.checkRateLimit(uid)) {
      return interaction.reply({ content: t(g, 'gd_error_ratelimit'), ephemeral: true });
    }

    try {
      if (group === 'account') {
        if (sub === 'link')   return await cmdAccountLink(interaction, g, uid);
        if (sub === 'unlink') return await cmdAccountUnlink(interaction, g, uid);
      }
      if (group === 'notify') {
        if (sub === 'setup')   return await cmdNotifySetup(interaction, g);
        if (sub === 'disable') return await cmdNotifyDisable(interaction, g);
      }
      switch (sub) {
        case 'profile':     return await cmdProfile(interaction, g, uid);
        case 'level':       return await cmdLevel(interaction, g);
        case 'daily':       return await cmdDaily(interaction, g);
        case 'weekly':      return await cmdWeekly(interaction, g);
        case 'leaderboard': return await cmdLeaderboard(interaction, g);
        case 'modlist':     return await cmdModlist(interaction, g);
        case 'checkmod':    return await cmdCheckmod(interaction, g);
      }
    } catch (err) {
      console.error('[gd]', err);
      const msg = { content: t(g, 'gd_error_generic'), ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};

// ─── /gd profile ─────────────────────────────────────────────────────────────
async function cmdProfile(interaction, g, uid) {
  await interaction.deferReply();

  let username = interaction.options.getString('username');

  // If no username, use linked account
  if (!username) {
    const linked = getLinkedAccount(uid);
    if (!linked) return interaction.editReply(t(g, 'gd_error_not_linked'));
    username = linked.gdUsername;
  }

  // Use direct profile endpoint for accurate data
  const player = await api.getPlayerProfile(username);
  if (!player) return interaction.editReply(t(g, 'gd_error_player_notfound', { username }));

  const modBadge = getModBadgeName(player.modBadge);

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'gd_profile_title', { username: player.username }))
    .setColor(player.modBadge > 0 ? 0xffd700 : GD_COLOR)
    .setURL(`https://gdbrowser.com/u/${encodeURIComponent(player.username)}`)
    .addFields(
      { name: t(g, 'gd_profile_stars'),         value: `⭐ ${player.stars}`,         inline: true },
      { name: t(g, 'gd_profile_demons'),         value: `👿 ${player.demons}`,         inline: true },
      { name: t(g, 'gd_profile_diamonds'),       value: `💎 ${player.diamonds}`,       inline: true },
      { name: t(g, 'gd_profile_coins'),          value: `🪙 ${player.coins}`,          inline: true },
      { name: t(g, 'gd_profile_user_coins'),     value: `🔵 ${player.userCoins}`,      inline: true },
      { name: t(g, 'gd_profile_creator_points'), value: `🏆 ${player.creatorPoints}`,  inline: true },
    );

  if (player.rank > 0) embed.addFields({ name: t(g, 'gd_profile_rank'), value: `#${player.rank}`, inline: true });
  if (modBadge) embed.addFields({ name: t(g, 'gd_profile_mod'), value: `🛡️ ${t(g, 'gd_mod_' + (player.modBadge === 2 ? 'elder' : 'regular'))}`, inline: true });

  embed.setFooter({ text: t(g, 'gd_profile_footer', { accountId: player.accountId || '?' }) });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /gd level ────────────────────────────────────────────────────────────────
async function cmdLevel(interaction, g) {
  await interaction.deferReply();

  const query = interaction.options.getString('query');
  const isId  = /^\d+$/.test(query.trim());

  const levels = isId
    ? [await api.getLevelById(parseInt(query))].filter(Boolean)
    : await api.searchLevels(query, 0, 0);

  if (!levels.length) return interaction.editReply(t(g, 'gd_error_level_notfound', { query }));

  const level = levels[0];
  const embed = buildLevelEmbed(g, level);

  // Pagination buttons if multiple results
  if (levels.length > 1) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`gd_level_prev_0`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(`gd_level_info_0_${levels.length}`).setLabel(`1 / ${levels.length}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId(`gd_level_next_0`).setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(levels.length <= 1),
    );
    return interaction.editReply({ embeds: [embed], components: [row] });
  }

  await interaction.editReply({ embeds: [embed] });
}

// ─── /gd daily ────────────────────────────────────────────────────────────────
async function cmdDaily(interaction, g) {
  await interaction.deferReply();
  const level = await api.getDailyLevel();
  if (!level) return interaction.editReply(t(g, 'gd_error_empty_response'));
  await interaction.editReply({
    content: t(g, 'gd_daily_header'),
    embeds: [buildLevelEmbed(g, level)],
  });
}

// ─── /gd weekly ───────────────────────────────────────────────────────────────
async function cmdWeekly(interaction, g) {
  await interaction.deferReply();
  const level = await api.getWeeklyDemon();
  if (!level) return interaction.editReply(t(g, 'gd_error_empty_response'));
  await interaction.editReply({
    content: t(g, 'gd_weekly_header'),
    embeds: [buildLevelEmbed(g, level)],
  });
}

// ─── /gd leaderboard ─────────────────────────────────────────────────────────
async function cmdLeaderboard(interaction, g) {
  await interaction.deferReply();

  const type = interaction.options.getString('type') || 'top';

  let players;
  if (type === 'server') {
    // Server leaderboard: only linked members
    const members = await interaction.guild.members.fetch();
    const memberIds = [...members.keys()];
    const linked = getLinkedAccountsForGuild(memberIds);
    if (!linked.length) return interaction.editReply(t(g, 'gd_leaderboard_empty'));

    // Fetch each player's data
    players = (await Promise.all(
      linked.map(l => api.getPlayerByAccountId(l.gdAccountId).catch(() => null))
    )).filter(Boolean).sort((a, b) => b.stars - a.stars).slice(0, 10);
  } else {
    players = (await api.getLeaderboard(type, 10)).slice(0, 10);
  }

  if (!players.length) return interaction.editReply(t(g, 'gd_leaderboard_empty'));

  const lines = players.map((p, i) =>
    `**#${i + 1}** ${p.username} — ⭐ ${p.stars} | 👿 ${p.demons}`
  );

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'gd_leaderboard_title_' + type))
    .setColor(GD_COLOR)
    .setDescription(lines.join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

// ─── /gd account link ─────────────────────────────────────────────────────────
async function cmdAccountLink(interaction, g, uid) {
  await interaction.deferReply({ ephemeral: true });

  const username = interaction.options.getString('username');
  const player   = await api.getPlayerProfile(username);

  if (!player) return interaction.editReply(t(g, 'gd_error_player_notfound', { username }));

  linkAccount(uid, player.username, player.accountId);

  await interaction.editReply(t(g, 'gd_account_link_success', {
    gdUsername: player.username,
    accountId: player.accountId || '?',
  }));
}

// ─── /gd account unlink ───────────────────────────────────────────────────────
async function cmdAccountUnlink(interaction, g, uid) {
  const linked = getLinkedAccount(uid);
  if (!linked) return interaction.reply({ content: t(g, 'gd_error_not_linked'), ephemeral: true });
  unlinkAccount(uid);
  await interaction.reply({ content: t(g, 'gd_account_unlink_success'), ephemeral: true });
}

// ─── /gd modlist ──────────────────────────────────────────────────────────────
async function cmdModlist(interaction, g) {
  await interaction.deferReply();
  const mods = await api.getModeratorList();
  if (!mods.length) return interaction.editReply(t(g, 'gd_modlist_empty'));

  const elders  = mods.filter(m => m.modBadge === 2).map(m => `👑 **${m.username}**`);
  const regular = mods.filter(m => m.modBadge === 1).map(m => `🛡️ ${m.username}`);

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'gd_modlist_title'))
    .setColor(0xffd700)
    .setDescription([...elders, ...regular].join('\n') || t(g, 'gd_modlist_empty'))
    .setFooter({ text: t(g, 'gd_modlist_footer', { count: mods.length }) });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /gd checkmod ─────────────────────────────────────────────────────────────
async function cmdCheckmod(interaction, g) {
  await interaction.deferReply();
  const username = interaction.options.getString('username');
  const player   = await api.getPlayerProfile(username);

  if (!player) return interaction.editReply(t(g, 'gd_error_player_notfound', { username }));

  const badge = getModBadgeName(player.modBadge);
  const isMod = player.modBadge > 0;

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'gd_checkmod_title', { username: player.username }))
    .setColor(isMod ? 0xffd700 : GD_COLOR)
    .setDescription(isMod
      ? t(g, 'gd_checkmod_is_mod', { username: player.username, badge })
      : t(g, 'gd_checkmod_not_mod', { username: player.username })
    );

  await interaction.editReply({ embeds: [embed] });
}

// ─── /gd notify setup ─────────────────────────────────────────────────────────
async function cmdNotifySetup(interaction, g) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: t(g, 'gd_error_no_permission'), ephemeral: true });
  }
  const daily  = interaction.options.getBoolean('daily')  ?? true;
  const weekly = interaction.options.getBoolean('weekly') ?? true;
  setNotifyConfig(g, interaction.channelId, daily, weekly);
  await interaction.reply({
    content: t(g, 'gd_notify_setup_success', {
      channel: `<#${interaction.channelId}>`,
      daily:   daily  ? '✅' : '❌',
      weekly:  weekly ? '✅' : '❌',
    }),
    ephemeral: true,
  });
}

// ─── /gd notify disable ───────────────────────────────────────────────────────
async function cmdNotifyDisable(interaction, g) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: t(g, 'gd_error_no_permission'), ephemeral: true });
  }
  removeNotifyConfig(g);
  await interaction.reply({ content: t(g, 'gd_notify_disable_success'), ephemeral: true });
}

// ─── Shared embed builder (exported for notifier) ────────────────────────────
function buildLevelEmbed(g, level) {
  const diff   = getDifficultyName(level);
  const length = getLengthName(level);
  const color  = level.isDemon ? DEMON_COLOR : GD_COLOR;

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'gd_level_title', { name: level.name, id: level.id }))
    .setColor(color)
    .setURL(`https://gdbrowser.com/${level.id}`)
    .addFields(
      { name: t(g, 'gd_level_difficulty'), value: diff || 'N/A',              inline: true },
      { name: t(g, 'gd_level_stars'),      value: `⭐ ${level.stars}`,        inline: true },
      { name: t(g, 'gd_level_length'),     value: length || 'Unknown',        inline: true },
      { name: t(g, 'gd_level_downloads'),  value: `⬇️ ${level.downloads}`,    inline: true },
      { name: t(g, 'gd_level_likes'),      value: `👍 ${level.likes}`,        inline: true },
      { name: t(g, 'gd_level_coins'),      value: `🪙 ${level.coins}${level.verifiedCoins ? ' ✅' : ''}`, inline: true },
    );

  if (level.description) embed.setDescription(`*${level.description.slice(0, 200)}*`);
  if (level.isEpic)      embed.addFields({ name: t(g, 'gd_level_epic'),     value: '🌟 Epic',     inline: true });
  if (level.featuredScore > 0) embed.addFields({ name: t(g, 'gd_level_featured'), value: '✨ Featured', inline: true });
  if (level.songName)    embed.addFields({ name: '🎵 Song', value: level.songName, inline: true });

  embed.setFooter({ text: t(g, 'gd_level_footer', { author: level.author || '?' }) });
  return embed;
}

module.exports.buildLevelEmbed = buildLevelEmbed;
