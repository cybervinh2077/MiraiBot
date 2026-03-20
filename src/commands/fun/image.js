const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const IMAGE_COLOR = 0xffc300;
const COOLDOWN_MS = 5000;
const cooldowns = new Map();

/** Pick a random item from an array */
function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Returns remaining cooldown seconds, or null if clear */
function checkCooldown(userId, key) {
  const cdKey = `image:${key}:${userId}`;
  const now = Date.now();
  const last = cooldowns.get(cdKey) || 0;
  const diff = now - last;
  if (diff < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - diff) / 1000);
  cooldowns.set(cdKey, now);
  return null;
}

// ─── Image fetchers ───────────────────────────────────────────────────────────
// All use free, no-key APIs already proven to work.

async function fetchNekosBest(category) {
  // nekos.best — same API used by /fun hug/kiss/cuddle
  const res = await fetch(`https://nekos.best/api/v2/${category}`);
  const data = await res.json();
  return data.results?.[0]?.url || null;
}

async function fetchCat() {
  // cataas.com — returns a random cat image URL
  const res = await fetch('https://api.thecatapi.com/v1/images/search');
  const data = await res.json();
  return data[0]?.url || 'https://cataas.com/cat';
}

async function fetchDog() {
  // dog.ceo — free, no key
  const res = await fetch('https://dog.ceo/api/breeds/image/random');
  const data = await res.json();
  return data.message || null;
}

// ─── Độ Mixi image pool ───────────────────────────────────────────────────────
// Ảnh streamer Độ Mixi (MixiGaming) — thêm URL trực tiếp vào đây
// Gợi ý: lấy từ fanpage, kenh14, YouTube thumbnail, v.v.
const MIXI_IMAGES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/20190411_%C4%90%E1%BB%99_Mixi.jpg/400px-20190411_%C4%90%E1%BB%99_Mixi.jpg',
  // Thêm URL ảnh Độ Mixi vào đây:
  // 'https://...',
  // 'https://...',
];

function getMixiImage() {
  return MIXI_IMAGES[Math.floor(Math.random() * MIXI_IMAGES.length)];
}

async function fetchMeme() {
  // meme-api.com — free, no key, pulls from Reddit
  const res = await fetch('https://meme-api.com/gimme');
  const data = await res.json();
  return { url: data.url, title: data.title, subreddit: data.subreddit };
}

// ─── Nekos.best category map for anime subcommands ───────────────────────────
// Maps subcommand name → nekos.best endpoint (all confirmed available)
const NEKOS_MAP = {
  kemonomimi: 'kemonomimi',
  kitsune:    'kitsune',
  megumin:    'megumin',
  neko:       'neko',
  okami:      'okami',
  rem:        'rem',
  senko:      'senko',
  shiro:      'shiro',
};

// ─── Command definition ───────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('image')
    .setDescription('Fetch random images from various categories')
    // ── irl group ──
    .addSubcommandGroup(group =>
      group.setName('irl').setDescription('Real-life images')
        .addSubcommand(sub => sub.setName('cat').setDescription('Get a random image of a cat'))
        .addSubcommand(sub => sub.setName('dog').setDescription('Get a random image of a dog'))
    )
    // ── anime group ──
    .addSubcommandGroup(group =>
      group.setName('anime').setDescription('Anime character images')
        .addSubcommand(sub => sub.setName('kemonomimi').setDescription('Get a random anime kemonomimi image'))
        .addSubcommand(sub => sub.setName('kitsune').setDescription('Get a random anime kitsune image'))
        .addSubcommand(sub => sub.setName('megumin').setDescription('Get a random anime Megumin image'))
        .addSubcommand(sub => sub.setName('neko').setDescription('Get a random anime neko image'))
        .addSubcommand(sub => sub.setName('okami').setDescription('Get a random anime okami image'))
        .addSubcommand(sub => sub.setName('rem').setDescription('Get a random anime Rem image'))
        .addSubcommand(sub => sub.setName('senko').setDescription('Get a random anime Senko image'))
        .addSubcommand(sub => sub.setName('shiro').setDescription('Get a random anime Shiro image'))
    )
    // ── meme (standalone subcommand) ──
    .addSubcommand(sub => sub.setName('meme').setDescription('Get a random meme from various subreddits')),

  // ─── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false); // 'irl' | 'anime' | null
    const sub   = interaction.options.getSubcommand();           // 'cat' | 'dog' | 'neko' | 'meme' | ...
    const cdKey = group ? `${group}.${sub}` : sub;

    // Cooldown check
    const cd = checkCooldown(interaction.user.id, cdKey);
    if (cd) {
      return interaction.reply({
        content: `⏳ Bạn dùng lệnh này quá nhanh, thử lại sau **${cd}s**.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      // ── irl ────────────────────────────────────────────────────────────────
      if (group === 'irl') {
        if (sub === 'cat') {
          const url = await fetchCat();
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('🐱 Random Cat')
              .setImage(url)
              .setColor(IMAGE_COLOR)
              .setFooter({ text: 'Powered by thecatapi.com' })],
          });
        }
        if (sub === 'dog') {
          const isMixi = Math.random() < 0.5;
          if (isMixi) {
            const url = getMixiImage();
            return interaction.editReply({
              embeds: [new EmbedBuilder()
                .setTitle('🎮 Độ Mixi xuất hiện!')
                .setDescription('*Bạn đã gặp streamer huyền thoại Độ Mixi!* 🎉')
                .setImage(url)
                .setColor(0xff6b35)
                .setFooter({ text: '50% chance • MixiGaming' })],
            });
          }
          const url = await fetchDog();
          return interaction.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('🐶 Random Dog')
              .setImage(url)
              .setColor(IMAGE_COLOR)
              .setFooter({ text: 'Powered by dog.ceo' })],
          });
        }
      }

      // ── anime ──────────────────────────────────────────────────────────────
      if (group === 'anime') {
        const endpoint = NEKOS_MAP[sub];
        const url = await fetchNekosBest(endpoint);
        const title = sub.charAt(0).toUpperCase() + sub.slice(1);
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle(`✨ Random Anime ${title}`)
            .setImage(url)
            .setColor(IMAGE_COLOR)
            .setFooter({ text: 'Powered by nekos.best' })],
        });
      }

      // ── meme ───────────────────────────────────────────────────────────────
      if (sub === 'meme') {
        const meme = await fetchMeme();
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle(meme.title || '😂 Random Meme')
            .setImage(meme.url)
            .setColor(IMAGE_COLOR)
            .setFooter({ text: `r/${meme.subreddit} • Powered by meme-api.com` })],
        });
      }
    } catch (err) {
      console.error(`[image/${cdKey}]`, err);
      const msg = { content: '❌ Đã xảy ra lỗi, vui lòng thử lại sau.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};
