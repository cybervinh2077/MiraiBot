const {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const { checkCooldown, buildEmbed, buildRateEmbed, runHug, runKiss, runCuddle, fetchGif, FUN_COLOR } = require('./funHelper');
const { t } = require('../../utils/i18n');

// ─── 8ball responses ─────────────────────────────────────────────────────────
const EIGHTBALL = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.',
  'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.',
  'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', 'Concentrate and ask again.',
  "Don't count on it.", 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.',
];

// ─── Emojify map ─────────────────────────────────────────────────────────────
const EMOJI_MAP = {
  love: '❤️', hate: '😡', happy: '😊', sad: '😢', ok: '👌',
  cat: '🐱', dog: '🐶', heart: '💖', fire: '🔥', cool: '😎',
  yes: '✅', no: '❌', money: '💰', star: '⭐', music: '🎵',
  pizza: '🍕', sleep: '😴', laugh: '😂', cry: '😭', wow: '😮',
};

// ─── RPS ─────────────────────────────────────────────────────────────────────
const RPS_CHOICES = ['rock', 'paper', 'scissors'];
const RPS_EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
function rpsResult(a, b) {
  if (a === b) return 'tie';
  if ((a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')) return 'win';
  return 'lose';
}

// ─── Rate configs ─────────────────────────────────────────────────────────────
const RATE_CONFIG = {
  dankness: { emoji: '💽', label: 'dank',          high: 'Absolute dank lord 👑' },
  howgay:   { emoji: '🏳️‍🌈', label: 'gay',          high: 'Certified rainbow energy 🌈' },
  ppsize:   { emoji: '🍆', label: 'cm pp size',    high: 'Legendary status 👀', unit: 'cm' },
  simp:     { emoji: '💕', label: 'simp',          high: 'Full simp mode activated 💘' },
  stank:    { emoji: '💨', label: 'stinky',        high: 'Biohazard level reached ☣️' },
  waifu:    { emoji: '💘', label: 'waifu material', high: 'Top tier waifu 🏆' },
};

// ─── Command definition ───────────────────────────────────────────────────────
const userOpt = (sub, desc) =>
  sub.addUserOption(o => o.setName('user').setDescription(desc).setRequired(false));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun')
    .setDescription('Fun commands 🎉')
    // ── hug / kiss / cuddle (reuse existing logic) ──
    .addSubcommand(sub =>
      userOpt(sub.setName('hug').setDescription('Ôm ai đó 🤗'), 'Người bạn muốn ôm'))
    .addSubcommand(sub =>
      userOpt(sub.setName('kiss').setDescription('Hôn ai đó 💋'), 'Người bạn muốn hôn'))
    .addSubcommand(sub =>
      userOpt(sub.setName('cuddle').setDescription('Cuddle với ai đó 🥰'), 'Người bạn muốn cuddle'))
    // ── 8ball ──
    .addSubcommand(sub =>
      sub.setName('8ball').setDescription('Hỏi Magic 8ball 🎱')
        .addStringOption(o => o.setName('question').setDescription('Câu hỏi của bạn').setRequired(true)))
    // ── clapify ──
    .addSubcommand(sub =>
      sub.setName('clapify').setDescription('Thêm 👏 vào giữa các từ')
        .addStringOption(o => o.setName('text').setDescription('Đoạn text').setRequired(true)))
    // ── cute-ugly ──
    .addSubcommand(sub =>
      userOpt(sub.setName('cute-ugly').setDescription('Đánh giá cute hay ugly 😍😈'), 'Target (mặc định: bạn)'))
    // ── emojify ──
    .addSubcommand(sub =>
      sub.setName('emojify').setDescription('Thay từ bằng emoji')
        .addStringOption(o => o.setName('text').setDescription('Đoạn text').setRequired(true)))
    // ── rps ──
    .addSubcommand(sub =>
      sub.setName('rps').setDescription('Oẳn tù xì ✊✋✌️')
        .addStringOption(o =>
          o.setName('choice').setDescription('Lựa chọn của bạn').setRequired(true)
            .addChoices(
              { name: '✊ Rock', value: 'rock' },
              { name: '✋ Paper', value: 'paper' },
              { name: '✌️ Scissors', value: 'scissors' },
            ))
        .addUserOption(o => o.setName('user').setDescription('Thách đấu ai đó (bot random nếu bỏ trống)').setRequired(false)))
    // ── rate subcommand group ──
    .addSubcommandGroup(group =>
      group.setName('rate').setDescription('Rate ai đó 📊')
        .addSubcommand(sub => userOpt(sub.setName('dankness').setDescription('Rate dankness 💽'), 'Target'))
        .addSubcommand(sub => userOpt(sub.setName('howgay').setDescription('Rate how gay 🏳️‍🌈'), 'Target'))
        .addSubcommand(sub => userOpt(sub.setName('ppsize').setDescription('Rate pp size 🍆'), 'Target'))
        .addSubcommand(sub => userOpt(sub.setName('simp').setDescription('Rate simp level 💕'), 'Target'))
        .addSubcommand(sub => userOpt(sub.setName('stank').setDescription('Rate stankiness 💨'), 'Target'))
        .addSubcommand(sub => userOpt(sub.setName('waifu').setDescription('Rate waifu material 💘'), 'Target'))
    ),

  // ─── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false); // 'rate' or null
    const sub = interaction.options.getSubcommand();             // actual subcommand name
    const cmdKey = group ? `fun.${group}.${sub}` : `fun.${sub}`;
    const userId = interaction.user.id;

    // Cooldown check (5s per user per subcommand)
    const cd = checkCooldown(userId, cmdKey);
    if (cd) {
      return interaction.reply({
        content: t(interaction.guild.id, 'error_cooldown', { sec: cd }),
        ephemeral: true,
      });
    }

    try {
      // ── Dispatch to subcommand handlers ──────────────────────────────────
      if (!group) {
        switch (sub) {
          case 'hug':      return await runHug(interaction);
          case 'kiss':     return await runKiss(interaction);
          case 'cuddle':   return await runCuddle(interaction);
          case '8ball':    return await handle8ball(interaction);
          case 'clapify':  return await handleClapify(interaction);
          case 'cute-ugly': return await handleCuteUgly(interaction);
          case 'emojify':  return await handleEmojify(interaction);
          case 'rps':      return await handleRps(interaction);
        }
      }

      // ── rate group ────────────────────────────────────────────────────────
      if (group === 'rate') {
        return await handleRate(interaction, sub);
      }
    } catch (err) {
      console.error(`[fun/${cmdKey}]`, err);
      const msg = { content: t(interaction.guild.id, 'error_generic'), ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};

// ─── Subcommand handlers ──────────────────────────────────────────────────────

async function handle8ball(interaction) {
  const question = interaction.options.getString('question');
  const answer = EIGHTBALL[Math.floor(Math.random() * EIGHTBALL.length)];
  const embed = new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setTitle('🎱 Magic 8ball')
    .setDescription(`**Q:** ${question}\n\n**A:** ${answer}`)
    .setFooter({ text: 'Fun command • not serious' });
  await interaction.reply({ embeds: [embed] });
}

async function handleClapify(interaction) {
  const text = interaction.options.getString('text');
  const result = text.trim().split(/\s+/).join(' 👏 ');
  const embed = new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setDescription(result)
    .setFooter({ text: 'Fun command • not serious' });
  await interaction.reply({ embeds: [embed] });
}

async function handleCuteUgly(interaction) {
  const target = interaction.options.getUser('user') || interaction.user;
  const n = Math.floor(Math.random() * 101);
  const text = n >= 50
    ? `**${target.displayName}** is **${n}%** Cute 😍`
    : `**${target.displayName}** is **${n}%** Ugly 😈`;
  await interaction.reply({ embeds: [buildRateEmbed(text)] });
}

async function handleEmojify(interaction) {
  const text = interaction.options.getString('text');
  const result = text.split(/\s+/).map(word => {
    const lower = word.toLowerCase().replace(/[^a-z]/g, '');
    return EMOJI_MAP[lower] ? `${word} ${EMOJI_MAP[lower]}` : word;
  }).join(' ');
  const embed = new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setDescription(result)
    .setFooter({ text: 'Fun command • not serious' });
  await interaction.reply({ embeds: [embed] });
}

async function handleRps(interaction) {
  const playerChoice = interaction.options.getString('choice');
  const opponent = interaction.options.getUser('user');
  const botChoice = RPS_CHOICES[Math.floor(Math.random() * 3)];

  // If opponent is tagged and is not the author, bot picks for opponent (UI limitation)
  const opponentName = (opponent && opponent.id !== interaction.user.id)
    ? opponent.displayName
    : '🤖 Bot';
  const opponentChoice = botChoice;

  const outcome = rpsResult(playerChoice, opponentChoice);
  const resultText = outcome === 'tie' ? '🤝 Hòa!' : outcome === 'win' ? '🎉 Bạn thắng!' : '😢 Bạn thua!';

  const embed = new EmbedBuilder()
    .setColor(FUN_COLOR)
    .setTitle('✊✋✌️ Oẳn tù xì')
    .setDescription(
      `**${interaction.user.displayName}:** ${RPS_EMOJI[playerChoice]} ${playerChoice}\n` +
      `**${opponentName}:** ${RPS_EMOJI[opponentChoice]} ${opponentChoice}\n\n` +
      resultText
    )
    .setFooter({ text: 'Fun command • not serious' });
  await interaction.reply({ embeds: [embed] });
}

async function handleRate(interaction, type) {
  const cfg = RATE_CONFIG[type];
  if (!cfg) return;
  const target = interaction.options.getUser('user') || interaction.user;
  const n = Math.floor(Math.random() * 101);
  const extra = n > 80 ? `\n*${cfg.high}*` : '';
  const unit = cfg.unit ? cfg.unit : '%';
  const text = `${cfg.emoji} **${target.displayName}** is **${n}${unit}** ${cfg.label}.${extra}`;
  await interaction.reply({ embeds: [buildRateEmbed(text)] });
}
