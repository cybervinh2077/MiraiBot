const { EmbedBuilder } = require('discord.js');

// Cooldown store
const cooldowns = new Map();
const COOLDOWN_MS = 3000;

function checkCooldown(userId, command) {
  const now = Date.now();
  if (!cooldowns.has(userId)) cooldowns.set(userId, new Map());
  const userCd = cooldowns.get(userId);
  const last = userCd.get(command) || 0;
  const diff = now - last;
  if (diff < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - diff) / 1000);
  userCd.set(command, now);
  return null;
}

// Nekos.best API - miễn phí, không cần key, trả về anime GIF
async function fetchGif(type) {
  try {
    const res = await fetch(`https://nekos.best/api/v2/${type}`);
    const data = await res.json();
    return data.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

function buildEmbed(text, gifUrl) {
  const embed = new EmbedBuilder()
    .setColor(0xff69b4)
    .setDescription(text);
  if (gifUrl) embed.setImage(gifUrl);
  return embed;
}

module.exports = { buildEmbed, checkCooldown, fetchGif };
