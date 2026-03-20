const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/i18n');

// ─── Cooldown ────────────────────────────────────────────────────────────────
const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/** Returns remaining seconds if on cooldown, null if clear */
function checkCooldown(userId, command) {
  const key = `${command}:${userId}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;
  const diff = now - last;
  if (diff < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - diff) / 1000);
  cooldowns.set(key, now);
  return null;
}

// ─── Nekos.best GIF ──────────────────────────────────────────────────────────
async function fetchGif(type) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${type}`);
    const data = await res.json();
    return data.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

// ─── Embed builders ──────────────────────────────────────────────────────────
const FUN_COLOR = 0xff66cc;

function buildEmbed(text, gifUrl) {
  const embed = new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setDescription(text)
    .setFooter({ text: 'Fun command • not serious' });
  if (gifUrl) embed.setImage(gifUrl);
  return embed;
}

function buildRateEmbed(text) {
  return new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setDescription(text)
    .setFooter({ text: 'Fun command • not serious' });
}

// ─── Reusable handlers for hug / kiss / cuddle ───────────────────────────────
// Called by both /hug and /fun hug (avoids duplicating logic)

async function runHug(interaction) {
  const g = interaction.guild.id;
  const cd = checkCooldown(interaction.user.id, 'hug');
  if (cd) return interaction.reply({ content: t(g, 'fun_cooldown', { sec: cd }), ephemeral: true });

  await interaction.deferReply();
  const target = interaction.options.getUser('user');
  const gif = await fetchGif('hug');
  const text = (!target || target.id === interaction.user.id)
    ? t(g, 'hug_self', { user: interaction.user.displayName })
    : t(g, 'hug_other', { user: interaction.user.displayName, target: target.displayName });
  await interaction.editReply({ embeds: [buildEmbed(text, gif)] });
}

async function runKiss(interaction) {
  const g = interaction.guild.id;
  const cd = checkCooldown(interaction.user.id, 'kiss');
  if (cd) return interaction.reply({ content: t(g, 'fun_cooldown', { sec: cd }), ephemeral: true });

  await interaction.deferReply();
  const target = interaction.options.getUser('user');
  const gif = await fetchGif('kiss');
  const text = (!target || target.id === interaction.user.id)
    ? t(g, 'kiss_self', { user: interaction.user.displayName })
    : t(g, 'kiss_other', { user: interaction.user.displayName, target: target.displayName });
  await interaction.editReply({ embeds: [buildEmbed(text, gif)] });
}

async function runCuddle(interaction) {
  const g = interaction.guild.id;
  const cd = checkCooldown(interaction.user.id, 'cuddle');
  if (cd) return interaction.reply({ content: t(g, 'fun_cooldown', { sec: cd }), ephemeral: true });

  await interaction.deferReply();
  const target = interaction.options.getUser('user');
  const gif = await fetchGif('cuddle');
  const text = (!target || target.id === interaction.user.id)
    ? t(g, 'cuddle_self', { user: interaction.user.displayName })
    : t(g, 'cuddle_other', { user: interaction.user.displayName, target: target.displayName });
  await interaction.editReply({ embeds: [buildEmbed(text, gif)] });
}

module.exports = {
  checkCooldown,
  fetchGif,
  buildEmbed,
  buildRateEmbed,
  runHug,
  runKiss,
  runCuddle,
  FUN_COLOR,
};
