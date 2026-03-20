const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const UTILITY_COLOR = 0x5865f2;
const COOLDOWN_MS = 5000;
const cooldowns = new Map();

function checkCooldown(userId, key) {
  const cdKey = `utility:${key}:${userId}`;
  const now = Date.now();
  const last = cooldowns.get(cdKey) || 0;
  const diff = now - last;
  if (diff < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - diff) / 1000);
  cooldowns.set(cdKey, now);
  return null;
}

// ─── Command definition ───────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('utility')
    .setDescription('Useful utility commands')
    .addSubcommandGroup(group =>
      group.setName('guild').setDescription('Guild-related utilities')
        .addSubcommand(sub => sub.setName('info').setDescription('View basic information about this guild'))
        .addSubcommand(sub => sub.setName('icon').setDescription("Get this guild's icon"))
        .addSubcommand(sub => sub.setName('banner').setDescription("Get this guild's banner"))
        .addSubcommand(sub => sub.setName('roles').setDescription("Get a list of this guild's roles"))
    )
    .addSubcommandGroup(group =>
      group.setName('user').setDescription('User-related utilities')
        .addSubcommand(sub =>
          sub.setName('info').setDescription('View information about a user or yourself')
            .addUserOption(o => o.setName('user').setDescription('Target user (default: you)').setRequired(false))
        )
        .addSubcommand(sub =>
          sub.setName('avatar').setDescription("View your avatar or another user's avatar")
            .addUserOption(o => o.setName('user').setDescription('Target user (default: you)').setRequired(false))
        )
    ),

  // ─── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub   = interaction.options.getSubcommand();
    const cdKey = `${group}.${sub}`;

    const cd = checkCooldown(interaction.user.id, cdKey);
    if (cd) {
      return interaction.reply({
        content: `⏳ Bạn dùng lệnh này quá nhanh, thử lại sau **${cd}s**.`,
        ephemeral: true,
      });
    }

    try {
      if (group === 'guild') {
        if (sub === 'info')   return await guildInfo(interaction);
        if (sub === 'icon')   return await guildIcon(interaction);
        if (sub === 'banner') return await guildBanner(interaction);
        if (sub === 'roles')  return await guildRoles(interaction);
      }
      if (group === 'user') {
        if (sub === 'info')   return await userInfo(interaction);
        if (sub === 'avatar') return await userAvatar(interaction);
      }
    } catch (err) {
      console.error(`[utility/${cdKey}]`, err);
      const msg = { content: '❌ Đã xảy ra lỗi khi xử lý lệnh utility, thử lại sau.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};

// ─── Guild handlers ───────────────────────────────────────────────────────────

async function guildInfo(interaction) {
  const guild = interaction.guild;
  await guild.fetch(); // ensure owner + full data loaded

  const owner = await guild.fetchOwner();
  const createdTs = Math.floor(guild.createdTimestamp / 1000);

  const textChannels  = guild.channels.cache.filter(c => c.type === 0).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;

  const embed = new EmbedBuilder()
    .setTitle(guild.name)
    .setColor(UTILITY_COLOR)
    .setThumbnail(guild.iconURL({ size: 1024 }))
    .addFields(
      { name: '🆔 ID',           value: guild.id,                                    inline: true },
      { name: '👑 Owner',        value: `${owner.user.tag}\n\`${owner.id}\``,         inline: true },
      { name: '👥 Members',      value: `${guild.memberCount}`,                       inline: true },
      { name: '💬 Text channels', value: `${textChannels}`,                           inline: true },
      { name: '🔊 Voice channels', value: `${voiceChannels}`,                         inline: true },
      { name: '🎭 Roles',        value: `${guild.roles.cache.size}`,                  inline: true },
      { name: '🚀 Boost level',  value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
      { name: '🌐 Locale',       value: guild.preferredLocale,                        inline: true },
      { name: '📅 Created',      value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`,   inline: false },
    )
    .setFooter({ text: 'Guild Info' });

  await interaction.reply({ embeds: [embed] });
}

async function guildIcon(interaction) {
  const guild = interaction.guild;
  const iconURL = guild.iconURL({ size: 1024, dynamic: true });

  if (!iconURL) {
    return interaction.reply({ content: '❌ Server này không có icon.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} — Icon`)
    .setURL(iconURL)
    .setImage(iconURL)
    .setColor(UTILITY_COLOR);

  await interaction.reply({ embeds: [embed] });
}

async function guildBanner(interaction) {
  const guild = interaction.guild;
  await guild.fetch();
  const bannerURL = guild.bannerURL({ size: 2048 });

  if (!bannerURL) {
    return interaction.reply({ content: '❌ Server này không có banner.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} — Banner`)
    .setURL(bannerURL)
    .setImage(bannerURL)
    .setColor(UTILITY_COLOR);

  await interaction.reply({ embeds: [embed] });
}

async function guildRoles(interaction) {
  const guild = interaction.guild;
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id)           // exclude @everyone
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join(' ');

  const truncated = roles.length > 4000 ? roles.slice(0, 4000) + '…' : roles;

  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} — Roles (${guild.roles.cache.size - 1})`)
    .setDescription(truncated || 'Không có role nào.')
    .setColor(UTILITY_COLOR);

  await interaction.reply({ embeds: [embed] });
}

// ─── User handlers ────────────────────────────────────────────────────────────

async function userInfo(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);

  const createdTs = Math.floor(target.createdTimestamp / 1000);
  const joinedTs  = member ? Math.floor(member.joinedTimestamp / 1000) : null;

  const roles = member
    ? member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .first(20)
        .map(r => `<@&${r.id}>`)
        .join(' ') || 'None'
    : 'N/A';

  const color = member?.displayColor || UTILITY_COLOR;
  const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });

  const embed = new EmbedBuilder()
    .setTitle(target.tag)
    .setThumbnail(avatarURL)
    .setColor(color)
    .addFields(
      { name: '🆔 ID',         value: target.id,                                      inline: true },
      { name: '🤖 Bot',        value: target.bot ? 'Yes' : 'No',                      inline: true },
      { name: '📅 Created',    value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`,      inline: false },
      ...(joinedTs ? [{ name: '📥 Joined server', value: `<t:${joinedTs}:D> (<t:${joinedTs}:R>)`, inline: false }] : []),
      { name: `🎭 Roles`,      value: roles,                                           inline: false },
    )
    .setFooter({ text: 'User Info' });

  await interaction.reply({ embeds: [embed] });
}

async function userAvatar(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const avatarURL = target.displayAvatarURL({ size: 1024, dynamic: true });

  const embed = new EmbedBuilder()
    .setTitle(`${target.tag} — Avatar`)
    .setURL(avatarURL)
    .setImage(avatarURL)
    .setColor(UTILITY_COLOR);

  await interaction.reply({ embeds: [embed] });
}
