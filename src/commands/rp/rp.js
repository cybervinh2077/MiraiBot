const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const RP_COLOR = 0xff66cc;
const COOLDOWN_MS = 5000;
const cooldowns = new Map();

function checkCooldown(userId, sub) {
  const key = `rp:${sub}:${userId}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;
  const diff = now - last;
  if (diff < COOLDOWN_MS) return Math.ceil((COOLDOWN_MS - diff) / 1000);
  cooldowns.set(key, now);
  return null;
}

// ─── nekos.best category map ──────────────────────────────────────────────────
// All categories confirmed available on nekos.best/api/v2/<category>
const NEKOS_CATEGORY = {
  baka:        'baka',
  bite:        'bite',
  blush:       'blush',
  cry:         'cry',
  dance:       'dance',
  handholding: 'handhold',
  insult:      'kick',      // closest available; swap if nekos adds 'insult'
  kill:        'kick',
  lewd:        'blush',
  lick:        'lick',
  nom:         'nom',
  pat:         'pat',
  poke:        'poke',
  pout:        'pout',
  punch:       'kick',
  shrug:       'shrug',
  slap:        'slap',
  sleepy:      'sleep',
  smug:        'smug',
  tickle:      'tickle',
};

async function fetchGif(action) {
  try {
    const category = NEKOS_CATEGORY[action];
    const res = await fetch(`https://nekos.best/api/v2/${category}`);
    const data = await res.json();
    return data.results?.[0]?.url || null;
  } catch {
    return null;
  }
}

// ─── Message templates ────────────────────────────────────────────────────────
// [withTarget, withoutTarget (null = command requires target)]
const MESSAGES = {
  baka:        ['{a} calls {t} a baka! 🙄',              null],
  bite:        ['{a} bites {t}!',                         null],
  blush:       ['{a} blushes at {t}...',                  '{a} is blushing... 😳'],
  cry:         ['{a} cries because of {t}...',            '{a} is crying... 😢'],
  dance:       ['{a} dances with {t}!',                   '{a} is dancing! 💃'],
  handholding: ['{a} holds {t}\'s hand 💞',               null],
  insult:      ['{a} insults {t}!',                       null],
  kill:        ['{a} kills {t}! (just roleplay 😱)',      null],
  lewd:        ['{a} calls {t} lewd! 👀',                 '{a} reacts to something lewd! 👀'],
  lick:        ['{a} licks {t}!?',                        null],
  nom:         ['{a} noms on {t}!',                       null],
  pat:         ['{a} pats {t}!',                          null],
  poke:        ['{a} pokes {t}!',                         null],
  pout:        ['{a} pouts at {t}!',                      '{a} is pouting... 😤'],
  punch:       ['{a} punches {t}!',                       null],
  shrug:       ['{a} shrugs at {t} 🤷',                   '{a} shrugs 🤷'],
  slap:        ['{a} slaps {t}!',                         null],
  sleepy:      ['{a} feels sleepy with {t}...',           '{a} is feeling sleepy... 😴'],
  smug:        ['{a} gives {t} a smug look 😏',           '{a} looks smug 😏'],
  tickle:      ['{a} tickles {t}!',                       null],
};

// ─── Subcommand definitions ───────────────────────────────────────────────────
// [name, description, userRequired]
const SUBCOMMANDS = [
  ['baka',        'Call someone a baka',                    true],
  ['bite',        'Bite someone',                           true],
  ['blush',       'Blush at someone or by yourself',        false],
  ['cry',         'Cry because of someone or alone',        false],
  ['dance',       'Dance with someone or alone',            false],
  ['handholding', 'Hold someone\'s hand',                   true],
  ['insult',      'Insult someone',                         true],
  ['kill',        'Kill someone (just roleplay)',            true],
  ['lewd',        'Call someone lewd or react to something lewd', false],
  ['lick',        'Lick someone',                           true],
  ['nom',         'Nom on someone',                         true],
  ['pat',         'Pat someone',                            true],
  ['poke',        'Poke someone',                           true],
  ['pout',        'Pout at someone or by yourself',         false],
  ['punch',       'Punch someone',                          true],
  ['shrug',       'Shrug at someone or by yourself',        false],
  ['slap',        'Slap someone',                           true],
  ['sleepy',      'Feel sleepy with someone or alone',      false],
  ['smug',        'Give someone a smug look or just be smug', false],
  ['tickle',      'Tickle someone',                         true],
];

// ─── Build SlashCommandBuilder dynamically ────────────────────────────────────
const builder = new SlashCommandBuilder()
  .setName('rp')
  .setDescription('Roleplay interactions with anime gifs');

for (const [name, desc, required] of SUBCOMMANDS) {
  builder.addSubcommand(sub => {
    sub.setName(name).setDescription(desc);
    sub.addUserOption(o =>
      o.setName('user').setDescription('Target user').setRequired(required)
    );
    return sub;
  });
}

// ─── Module export ────────────────────────────────────────────────────────────
module.exports = {
  data: builder,

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    const cd = checkCooldown(interaction.user.id, sub);
    if (cd) {
      return interaction.reply({
        content: `⏳ Bạn dùng lệnh này quá nhanh, thử lại sau **${cd}s**.`,
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const author = interaction.member?.displayName ?? interaction.user.displayName;
      const targetUser = interaction.options.getUser('user');
      const target = targetUser ? (interaction.guild.members.cache.get(targetUser.id)?.displayName ?? targetUser.displayName) : null;

      const [withTarget, withoutTarget] = MESSAGES[sub];

      // If command requires target but somehow none provided, bail
      if (!target && withoutTarget === null) {
        return interaction.editReply({ content: '❌ Bạn cần mention một người dùng cho lệnh này.' });
      }

      const text = target
        ? withTarget.replaceAll('{a}', `**${author}**`).replaceAll('{t}', `**${target}**`)
        : withoutTarget.replaceAll('{a}', `**${author}**`);

      const gif = await fetchGif(sub);

      const embed = new EmbedBuilder()
        .setColor(RP_COLOR)
        .setDescription(text)
        .setFooter({ text: 'Roleplay command • just for fun' });

      if (gif) embed.setImage(gif);

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(`[rp/${sub}]`, err);
      const msg = { content: '❌ Có lỗi xảy ra, thử lại sau nhé!', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};
