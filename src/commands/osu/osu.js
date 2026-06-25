const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');
const api = require('../../osu/osuApi');
const { linkAccount, unlinkAccount, getLinkedAccount } = require('../../osu/osuAccount');

const OSU_PINK = 0xff66aa;
const OSU_ICON = 'https://osu.ppy.sh/images/layout/avatar-guest@2x.png';

const MODE_NAMES = { osu: 'osu!', taiko: 'osu!taiko', fruits: 'osu!catch', mania: 'osu!mania' };
const MODE_CHOICES = [
  { name: 'osu! (standard)', value: 'osu' },
  { name: 'osu!taiko',       value: 'taiko' },
  { name: 'osu!catch',       value: 'fruits' },
  { name: 'osu!mania',       value: 'mania' },
];

// ─── Formatters ─────────────────────────────────────────────────────────────────
const fmtNum = (n) => (n ?? 0).toLocaleString('en-US');

function fmtLen(sec) {
  sec = sec || 0;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtHours(sec) {
  return `${Math.floor((sec || 0) / 3600).toLocaleString('en-US')}h`;
}

function flag(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

const GRADES = { XH: 'SS+', X: 'SS', SH: 'S+', S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', F: 'F' };
const gradeDisplay = (r) => GRADES[r] || r || '?';

function modsDisplay(mods) {
  if (!Array.isArray(mods) || !mods.length) return '';
  const arr = mods.map(m => (typeof m === 'string' ? m : m?.acronym)).filter(Boolean);
  return arr.length ? `\`+${arr.join('')}\`` : '';
}

const starRating = (n) => `⭐${(n || 0).toFixed(2)}`;

// ─── Slash command ────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('osu')
    .setDescription('Lệnh osu! (game)')
    .addSubcommand(s =>
      s.setName('profile').setDescription('Xem profile người chơi osu!')
        .addStringOption(o => o.setName('username').setDescription('osu! username (để trống = tài khoản đã link)'))
        .addStringOption(o => o.setName('mode').setDescription('Chế độ chơi').addChoices(...MODE_CHOICES)))
    .addSubcommand(s =>
      s.setName('top').setDescription('Top plays (best performance) của người chơi')
        .addStringOption(o => o.setName('username').setDescription('osu! username (để trống = tài khoản đã link)'))
        .addStringOption(o => o.setName('mode').setDescription('Chế độ chơi').addChoices(...MODE_CHOICES)))
    .addSubcommand(s =>
      s.setName('recent').setDescription('Lượt chơi gần nhất của người chơi')
        .addStringOption(o => o.setName('username').setDescription('osu! username (để trống = tài khoản đã link)'))
        .addStringOption(o => o.setName('mode').setDescription('Chế độ chơi').addChoices(...MODE_CHOICES)))
    .addSubcommand(s =>
      s.setName('beatmap').setDescription('Thông tin một beatmap theo ID')
        .addStringOption(o => o.setName('id').setDescription('Beatmap (difficulty) ID').setRequired(true)))
    .addSubcommand(s =>
      s.setName('link').setDescription('Liên kết osu! username với Discord của bạn')
        .addStringOption(o => o.setName('username').setDescription('osu! username').setRequired(true))
        .addStringOption(o => o.setName('mode').setDescription('Chế độ mặc định').addChoices(...MODE_CHOICES)))
    .addSubcommand(s => s.setName('unlink').setDescription('Hủy liên kết tài khoản osu!')),

  async execute(interaction) {
    const g   = interaction.guild.id;
    const uid = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    if (!api.isConfigured()) {
      return interaction.reply({ content: t(g, 'osu_not_configured'), ephemeral: true });
    }
    if (!api.checkRateLimit(uid)) {
      return interaction.reply({ content: t(g, 'osu_ratelimit'), ephemeral: true });
    }

    try {
      switch (sub) {
        case 'profile': return await cmdProfile(interaction, g, uid);
        case 'top':     return await cmdScores(interaction, g, uid, 'best');
        case 'recent':  return await cmdScores(interaction, g, uid, 'recent');
        case 'beatmap': return await cmdBeatmap(interaction, g);
        case 'link':    return await cmdLink(interaction, g, uid);
        case 'unlink':  return await cmdUnlink(interaction, g, uid);
      }
    } catch (err) {
      console.error('[osu]', err);
      const msg = { content: t(g, 'osu_error_generic'), ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};

// Lấy username + mode từ option, fallback về tài khoản đã link
function resolveTarget(interaction, uid) {
  let username = interaction.options.getString('username');
  let mode     = interaction.options.getString('mode');
  if (!username) {
    const linked = getLinkedAccount(uid);
    if (linked) {
      username = linked.osuUsername;
      if (!mode) mode = linked.mode;
    }
  }
  return { username, mode: mode || 'osu' };
}

// ─── /osu profile ─────────────────────────────────────────────────────────────
async function cmdProfile(interaction, g, uid) {
  await interaction.deferReply();
  const { username, mode } = resolveTarget(interaction, uid);
  if (!username) return interaction.editReply(t(g, 'osu_not_linked'));

  const user = await api.getUser(username, mode);
  if (!user) return interaction.editReply(t(g, 'osu_user_notfound', { username }));

  const s  = user.statistics || {};
  const gc = s.grade_counts || {};
  const joined = user.join_date ? new Date(user.join_date).toISOString().slice(0, 10) : '?';
  const status = user.is_online ? '🟢 Online' : '⚫ Offline';

  const embed = new EmbedBuilder()
    .setColor(OSU_PINK)
    .setAuthor({ name: `${MODE_NAMES[mode]} • Profile`, iconURL: OSU_ICON })
    .setTitle(`${flag(user.country_code)} ${user.username}`)
    .setURL(`https://osu.ppy.sh/users/${user.id}/${mode}`)
    .setThumbnail(user.avatar_url)
    .setDescription(`**Grades:** SS \`${(gc.ss || 0) + (gc.ssh || 0)}\` • S \`${(gc.s || 0) + (gc.sh || 0)}\` • A \`${gc.a || 0}\``)
    .addFields(
      { name: '🌍 Global Rank',  value: s.global_rank  ? `#${fmtNum(s.global_rank)}`  : 'N/A', inline: true },
      { name: `${flag(user.country_code) || '🏳️'} Country Rank`, value: s.country_rank ? `#${fmtNum(s.country_rank)}` : 'N/A', inline: true },
      { name: '💧 PP',           value: `${fmtNum(Math.round(s.pp || 0))}pp`, inline: true },
      { name: '🎯 Accuracy',     value: `${(s.hit_accuracy || 0).toFixed(2)}%`, inline: true },
      { name: '🎮 Play Count',   value: fmtNum(s.play_count), inline: true },
      { name: '📈 Level',        value: `${s.level?.current ?? 0} (${s.level?.progress ?? 0}%)`, inline: true },
      { name: '🏅 Ranked Score', value: fmtNum(s.ranked_score), inline: true },
      { name: '🔗 Max Combo',    value: `${fmtNum(s.maximum_combo)}x`, inline: true },
      { name: '⏱️ Play Time',    value: fmtHours(s.play_time), inline: true },
    )
    .setFooter({ text: t(g, 'osu_profile_footer', { joined, status }) });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /osu top & /osu recent ─────────────────────────────────────────────────────
async function cmdScores(interaction, g, uid, type) {
  await interaction.deferReply();
  const { username, mode } = resolveTarget(interaction, uid);
  if (!username) return interaction.editReply(t(g, 'osu_not_linked'));

  const user = await api.getUser(username, mode);
  if (!user) return interaction.editReply(t(g, 'osu_user_notfound', { username }));

  const scores = await api.getUserScores(user.id, type, mode, type === 'best' ? 5 : 1);
  if (!scores.length) return interaction.editReply(t(g, 'osu_no_scores', { username: user.username }));

  if (type === 'best') {
    const lines = scores.map((sc, i) => {
      const set = sc.beatmapset || {}, bm = sc.beatmap || {};
      const title = `${set.artist || '?'} - ${set.title || '?'} [${bm.version || '?'}]`;
      return `**#${i + 1}** [${title}](${bm.url || 'https://osu.ppy.sh'}) ${modsDisplay(sc.mods)}\n`
        + `${starRating(bm.difficulty_rating)} • **${gradeDisplay(sc.rank)}** • ${((sc.accuracy || 0) * 100).toFixed(2)}% • `
        + `**${Math.round(sc.pp || 0)}pp** • ${fmtNum(sc.max_combo)}x`;
    });
    const embed = new EmbedBuilder()
      .setColor(OSU_PINK)
      .setAuthor({ name: `${MODE_NAMES[mode]} • Top Plays`, iconURL: OSU_ICON })
      .setTitle(t(g, 'osu_top_title', { username: user.username }))
      .setURL(`https://osu.ppy.sh/users/${user.id}/${mode}`)
      .setThumbnail(user.avatar_url)
      .setDescription(lines.join('\n\n'));
    return interaction.editReply({ embeds: [embed] });
  }

  // recent — 1 lượt gần nhất
  const sc  = scores[0];
  const set = sc.beatmapset || {}, bm = sc.beatmap || {};
  const embed = new EmbedBuilder()
    .setColor(OSU_PINK)
    .setAuthor({ name: t(g, 'osu_recent_title', { username: user.username }), iconURL: user.avatar_url })
    .setTitle(`${set.artist || '?'} - ${set.title || '?'}`)
    .setURL(bm.url || 'https://osu.ppy.sh')
    .setDescription(`**[${bm.version || '?'}]** ${modsDisplay(sc.mods)}`)
    .setThumbnail(set.covers?.list || user.avatar_url)
    .addFields(
      { name: 'Grade',    value: `**${gradeDisplay(sc.rank)}**`, inline: true },
      { name: 'Accuracy', value: `${((sc.accuracy || 0) * 100).toFixed(2)}%`, inline: true },
      { name: 'PP',       value: sc.pp ? `${Math.round(sc.pp)}pp` : '—', inline: true },
      { name: 'Combo',    value: `${fmtNum(sc.max_combo)}x`, inline: true },
      { name: 'Stars',    value: `${(bm.difficulty_rating || 0).toFixed(2)}★`, inline: true },
      { name: 'Score',    value: fmtNum(sc.score), inline: true },
    );
  await interaction.editReply({ embeds: [embed] });
}

// ─── /osu beatmap ───────────────────────────────────────────────────────────────
async function cmdBeatmap(interaction, g) {
  await interaction.deferReply();
  const raw = interaction.options.getString('id').trim();
  const id  = raw.match(/\d+/)?.[0];
  if (!id) return interaction.editReply(t(g, 'osu_beatmap_notfound', { id: raw }));

  const bm = await api.getBeatmap(id);
  if (!bm) return interaction.editReply(t(g, 'osu_beatmap_notfound', { id }));

  const set = bm.beatmapset || {};
  const embed = new EmbedBuilder()
    .setColor(OSU_PINK)
    .setAuthor({ name: `${MODE_NAMES[bm.mode] || 'osu!'} • Beatmap`, iconURL: OSU_ICON })
    .setTitle(`${set.artist || '?'} - ${set.title || '?'} [${bm.version || '?'}]`)
    .setURL(bm.url || `https://osu.ppy.sh/b/${id}`)
    .addFields(
      { name: '⭐ Stars',      value: `${(bm.difficulty_rating || 0).toFixed(2)}`, inline: true },
      { name: '🎹 Mapper',     value: set.creator || '?', inline: true },
      { name: '🎵 BPM',        value: `${bm.bpm ?? '?'}`, inline: true },
      { name: '⏱️ Length',     value: fmtLen(bm.total_length), inline: true },
      { name: '📊 Status',     value: bm.status || '?', inline: true },
      { name: '🔢 Max Combo',  value: bm.max_combo ? `${fmtNum(bm.max_combo)}x` : '—', inline: true },
      { name: '⚙️ CS / AR / OD / HP', value: `${bm.cs} / ${bm.ar} / ${bm.accuracy} / ${bm.drain}`, inline: false },
    );
  if (set.covers?.cover) embed.setImage(set.covers.cover);

  await interaction.editReply({ embeds: [embed] });
}

// ─── /osu link & unlink ─────────────────────────────────────────────────────────
async function cmdLink(interaction, g, uid) {
  await interaction.deferReply({ ephemeral: true });
  const username = interaction.options.getString('username');
  const mode     = interaction.options.getString('mode') || 'osu';

  const user = await api.getUser(username, mode);
  if (!user) return interaction.editReply(t(g, 'osu_user_notfound', { username }));

  linkAccount(uid, user.username, user.id, mode);
  await interaction.editReply(t(g, 'osu_link_success', { username: user.username, mode: MODE_NAMES[mode] }));
}

async function cmdUnlink(interaction, g, uid) {
  if (!getLinkedAccount(uid)) return interaction.reply({ content: t(g, 'osu_not_linked'), ephemeral: true });
  unlinkAccount(uid);
  await interaction.reply({ content: t(g, 'osu_unlink_success'), ephemeral: true });
}
