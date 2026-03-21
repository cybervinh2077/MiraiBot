const { EmbedBuilder } = require('discord.js');
const { randomUUID }   = require('crypto');
const {
  getRandomPokemon, getPokemonByDexId, getPokemonByName,
  getEvolutionTargets, getSpriteUrl,
} = require('./pokemonDex');
const {
  getUserProfile, setUserProfile,
  getSpawn, setSpawn, clearSpawn,
  loadData, saveData,
  createTrade, getTrade, updateTrade,
} = require('./pokemonStorage');

const POKE_COLOR   = 0xffcb05;
const SHINY_RATE   = 1 / 4096;
const SPAWN_EXPIRE = 2 * 60 * 1000; // 2 min
const DAILY_REWARD = 500;

// ─── Shop catalogue ───────────────────────────────────────────────────────────
const SHOP_ITEMS = {
  pokeball:    { price: 100,  label: 'Pokéball',        desc: '+5% catch rate' },
  greatball:   { price: 250,  label: 'Greatball',       desc: '+10% catch rate' },
  ultraball:   { price: 500,  label: 'Ultraball',       desc: '+20% catch rate (great for shiny!)' },
  exp_candy_s: { price: 400,  label: 'Exp Candy S',     desc: '+100 XP to one Pokémon' },
  exp_candy_m: { price: 900,  label: 'Exp Candy M',     desc: '+300 XP to one Pokémon' },
  rename_tag:  { price: 200,  label: 'Rename Tag',      desc: 'Give a Pokémon a nickname' },
  box_upgrade: { price: 1000, label: 'Box Upgrade',     desc: '+50 max box slots' },
  evo_charm:   { price: 1500, label: 'Evolution Charm', desc: 'Reduces XP needed to evolve by 20% (permanent)' },
};

// ─── Inventory helpers ────────────────────────────────────────────────────────
function addItem(profile, itemKey, amount = 1) {
  if (!profile.inventory) profile.inventory = {};
  profile.inventory[itemKey] = (profile.inventory[itemKey] || 0) + amount;
}

function removeItem(profile, itemKey, amount = 1) {
  if (!profile.inventory || (profile.inventory[itemKey] || 0) < amount) return false;
  profile.inventory[itemKey] -= amount;
  return true;
}

// ─── Spawn counter per channel (in-memory) ────────────────────────────────────
const msgCounters = new Map(); // channelId → count

function getSpawnThreshold() {
  return Math.floor(Math.random() * 21) + 20; // 20–40
}

// Called from messageCreate event
async function onMessageForSpawn(message) {
  if (message.author.bot || !message.guild) return;

  const channelId = message.channel.id;

  // Check if existing spawn expired
  const existing = getSpawn(channelId);
  if (existing && Date.now() > existing.expiresAt) {
    clearSpawn(channelId);
    message.channel.send('🌿 The wild Pokémon fled...').catch(() => {});
  }

  // Increment counter
  const count = (msgCounters.get(channelId) || 0) + 1;
  msgCounters.set(channelId, count);

  if (!msgCounters.has(channelId + '_threshold')) {
    msgCounters.set(channelId + '_threshold', getSpawnThreshold());
  }

  if (count < msgCounters.get(channelId + '_threshold')) return;

  // Reset counter + threshold
  msgCounters.set(channelId, 0);
  msgCounters.set(channelId + '_threshold', getSpawnThreshold());

  // Don't spawn if one already active
  if (getSpawn(channelId)) return;

  const species = getRandomPokemon();
  if (!species) return;

  const spawn = { dexId: species.dexId, createdAt: Date.now(), expiresAt: Date.now() + SPAWN_EXPIRE };
  setSpawn(channelId, spawn);

  const embed = new EmbedBuilder()
    .setTitle('⚡ A wild Pokémon appeared!')
    .setDescription(`Use \`/poke catch <name>\` to catch it!\n*It will flee in 2 minutes...*`)
    .setColor(POKE_COLOR)
    .setImage(getSpriteUrl(species.dexId))
    .setFooter({ text: `Hint: It's a ${species.types.join('/')} type!` });

  message.channel.send({ embeds: [embed] }).catch(() => {});
}

// ─── XP / Level ───────────────────────────────────────────────────────────────
function getRequiredXpForLevel(level, evoCharm = false) {
  const base = 10 * level * level;
  return evoCharm ? Math.floor(base * 0.8) : base;
}

function addXpToPokemon(pokemonInstance, xpGain) {
  pokemonInstance.xp += xpGain;
  let leveled = false;
  while (pokemonInstance.xp >= getRequiredXpForLevel(pokemonInstance.level, pokemonInstance.evoCharm)) {
    pokemonInstance.xp -= getRequiredXpForLevel(pokemonInstance.level, pokemonInstance.evoCharm);
    pokemonInstance.level++;
    leveled = true;
  }
  return leveled;
}

// ─── Catch ────────────────────────────────────────────────────────────────────
async function catchPokemon(interaction) {
  const channelId = interaction.channelId;
  const guildId   = interaction.guild.id;
  const userId    = interaction.user.id;
  const nameInput = interaction.options.getString('name');
  const ballInput = interaction.options.getString('ball') || null;

  const spawn = getSpawn(channelId);
  if (!spawn) return interaction.reply({ content: '🌿 No wild Pokémon in this channel right now.', ephemeral: true });

  if (Date.now() > spawn.expiresAt) {
    clearSpawn(channelId);
    return interaction.reply({ content: '💨 Too late! The Pokémon fled.', ephemeral: true });
  }

  const species = getPokemonByDexId(spawn.dexId);
  const guess   = getPokemonByName(nameInput);

  if (!guess || guess.dexId !== spawn.dexId) {
    return interaction.reply({ content: `❌ Wrong name! Try again.`, ephemeral: true });
  }

  const { profile, data } = getUserProfile(guildId, userId);

  // Box size check
  if (profile.pokemons.length >= (profile.maxBoxSize || 100)) {
    return interaction.reply({ content: `📦 Your box is full! (${profile.maxBoxSize} slots). Buy a Box Upgrade with \`/poke buy box_upgrade\`.`, ephemeral: true });
  }

  // Ball logic
  const BALL_BONUS = { pokeball: 0.05, greatball: 0.10, ultraball: 0.20 };
  const BASE_CATCH_RATE = 0.50;
  let catchRate = BASE_CATCH_RATE;
  let ballUsed = null;

  if (ballInput) {
    if (!BALL_BONUS[ballInput]) return interaction.reply({ content: '❌ Invalid ball type.', ephemeral: true });
    if (!removeItem(profile, ballInput, 1)) {
      return interaction.reply({ content: `❌ You don't have any **${SHOP_ITEMS[ballInput].label}**!`, ephemeral: true });
    }
    catchRate += BALL_BONUS[ballInput];
    ballUsed = ballInput;
  }

  if (Math.random() > catchRate) {
    data.users[guildId][userId] = profile;
    saveData(data);
    const ballMsg = ballUsed ? ` (${SHOP_ITEMS[ballUsed].label} used)` : '';
    return interaction.reply({ content: `💨 The Pokémon broke free!${ballMsg}`, ephemeral: true });
  }

  const shiny = Math.random() < SHINY_RATE;
  const instance = {
    uid:       randomUUID().slice(0, 8),
    dexId:     species.dexId,
    nickname:  null,
    level:     Math.floor(Math.random() * 5) + 1,
    xp:        0,
    shiny,
    evoCharm:  false,
    createdAt: Date.now(),
  };

  profile.pokemons.push(instance);
  profile.stats.caught++;
  if (shiny) profile.stats.shinyCaught++;
  profile.credits += 50;
  clearSpawn(channelId);
  data.users[guildId][userId] = profile;
  saveData(data);

  const shinyTag = shiny ? ' ✨ **SHINY!**' : '';
  const ballTag  = ballUsed ? ` • Used: ${SHOP_ITEMS[ballUsed].label}` : '';
  const embed = new EmbedBuilder()
    .setTitle(`🎉 You caught a Pokémon!${shinyTag}`)
    .setDescription(`${interaction.user} caught **${species.name}**!\nLevel: **${instance.level}** | UID: \`${instance.uid}\`\n+50 credits${ballTag}`)
    .setColor(shiny ? 0xffd700 : POKE_COLOR)
    .setImage(getSpriteUrl(species.dexId))
    .setFooter({ text: `Types: ${species.types.join(' / ')}` });

  await interaction.reply({ embeds: [embed] });
}

// ─── Evolve ───────────────────────────────────────────────────────────────────
async function evolvePokemon(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const uid     = interaction.options.getString('uid');

  const { profile, data } = getUserProfile(guildId, userId);
  const idx = profile.pokemons.findIndex(p => p.uid === uid);
  if (idx === -1) return interaction.reply({ content: '❌ Pokémon not found.', ephemeral: true });

  const instance = profile.pokemons[idx];
  const targets  = getEvolutionTargets(instance.dexId, instance.level);
  if (!targets.length) return interaction.reply({ content: '❌ This Pokémon cannot evolve yet.', ephemeral: true });

  const oldSpecies = getPokemonByDexId(instance.dexId);
  const newDexId   = targets[0].to;
  const newSpecies = getPokemonByDexId(newDexId);
  if (!newSpecies) return interaction.reply({ content: '❌ Evolution data missing.', ephemeral: true });

  instance.dexId = newDexId;
  instance.xp    = 0; // reset XP on evolution
  profile.pokemons[idx] = instance;
  data.users[guildId][userId] = profile;
  saveData(data);

  const embed = new EmbedBuilder()
    .setTitle('🌟 Evolution!')
    .setDescription(`**${oldSpecies.name}** evolved into **${newSpecies.name}**!`)
    .setColor(0x7b2fff)
    .setImage(getSpriteUrl(newDexId))
    .setFooter({ text: `Types: ${newSpecies.types.join(' / ')}` });

  await interaction.reply({ embeds: [embed] });
}

// ─── Duel ─────────────────────────────────────────────────────────────────────
async function duelPokemon(interaction) {
  const guildId    = interaction.guild.id;
  const userId     = interaction.user.id;
  const targetUser = interaction.options.getUser('user');

  if (targetUser.id === userId) return interaction.reply({ content: '❌ You cannot duel yourself.', ephemeral: true });
  if (targetUser.bot)           return interaction.reply({ content: '❌ You cannot duel a bot.', ephemeral: true });

  const { profile: p1, data } = getUserProfile(guildId, userId);
  const { profile: p2 }       = getUserProfile(guildId, targetUser.id);

  if (!p1.pokemons.length) return interaction.reply({ content: '❌ You have no Pokémon! Use `/poke start`.', ephemeral: true });
  if (!p2.pokemons.length) return interaction.reply({ content: `❌ ${targetUser.displayName} has no Pokémon!`, ephemeral: true });

  const pick = (pokemons) => pokemons.reduce((a, b) => a.level >= b.level ? a : b);
  const inst1 = pick(p1.pokemons);
  const inst2 = pick(p2.pokemons);
  const sp1   = getPokemonByDexId(inst1.dexId);
  const sp2   = getPokemonByDexId(inst2.dexId);

  const power = (sp, inst) => {
    const base = (sp.baseStats.atk + sp.baseStats.spa) + inst.level * 2;
    return base * (0.9 + Math.random() * 0.2); // ±10%
  };

  const p1Power = power(sp1, inst1);
  const p2Power = power(sp2, inst2);
  const p1Wins  = p1Power >= p2Power;

  const winner = p1Wins ? interaction.user : targetUser;
  const loser  = p1Wins ? targetUser : interaction.user;

  // XP + credits
  const winXp = Math.floor(Math.random() * 51) + 50;
  const loseXp = Math.floor(Math.random() * 21) + 20;

  if (p1Wins) {
    addXpToPokemon(inst1, winXp);  p1.stats.duelsWon++;  p1.credits += 100;
    addXpToPokemon(inst2, loseXp); p2.stats.duelsLost++; p2.credits += 30;
  } else {
    addXpToPokemon(inst2, winXp);  p2.stats.duelsWon++;  p2.credits += 100;
    addXpToPokemon(inst1, loseXp); p1.stats.duelsLost++; p1.credits += 30;
  }

  data.users[guildId][userId]       = p1;
  data.users[guildId][targetUser.id] = p2;
  saveData(data);

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Pokémon Duel!')
    .setDescription(
      `**${interaction.user.displayName}**'s ${sp1.name} (Lv.${inst1.level}) vs ` +
      `**${targetUser.displayName}**'s ${sp2.name} (Lv.${inst2.level})\n\n` +
      `🏆 **${winner.displayName}** wins!`
    )
    .setColor(POKE_COLOR)
    .setThumbnail(getSpriteUrl(inst1.dexId))
    .setImage(getSpriteUrl(inst2.dexId))
    .setFooter({ text: `Winner gets +100 credits & ${winXp} XP` });

  await interaction.reply({ embeds: [embed] });
}

// ─── Trade ────────────────────────────────────────────────────────────────────
async function tradeStart(interaction) {
  const guildId       = interaction.guild.id;
  const fromId        = interaction.user.id;
  const toUser        = interaction.options.getUser('user');
  const fromUid       = interaction.options.getString('yourpokemon');
  const toUid         = interaction.options.getString('theirpokemon') || null;

  if (toUser.id === fromId) return interaction.reply({ content: '❌ Cannot trade with yourself.', ephemeral: true });
  if (toUser.bot)           return interaction.reply({ content: '❌ Cannot trade with a bot.', ephemeral: true });

  const { profile: fromProfile } = getUserProfile(guildId, fromId);
  const fromMon = fromProfile.pokemons.find(p => p.uid === fromUid);
  if (!fromMon) return interaction.reply({ content: '❌ You do not own that Pokémon.', ephemeral: true });

  if (toUid) {
    const { profile: toProfile } = getUserProfile(guildId, toUser.id);
    const toMon = toProfile.pokemons.find(p => p.uid === toUid);
    if (!toMon) return interaction.reply({ content: `❌ ${toUser.displayName} does not own that Pokémon.`, ephemeral: true });
  }

  const tradeId = createTrade({
    guildId, fromId, toId: toUser.id,
    fromPokemonUid: fromUid, toPokemonUid: toUid,
    status: 'pending',
  });

  const fromSp = getPokemonByDexId(fromMon.dexId);
  const embed = new EmbedBuilder()
    .setTitle('🔄 Trade Request')
    .setDescription(
      `${interaction.user} wants to trade with ${toUser}!\n\n` +
      `**Offering:** ${fromSp.name} (Lv.${fromMon.level}) \`${fromUid}\`\n` +
      (toUid ? `**Requesting:** \`${toUid}\`\n` : '') +
      `\nTrade ID: \`${tradeId}\`\n` +
      `Use \`/poke trade accept ${tradeId}\` to accept or \`/poke trade decline ${tradeId}\` to decline.`
    )
    .setColor(POKE_COLOR)
    .setImage(getSpriteUrl(fromMon.dexId));

  await interaction.reply({ embeds: [embed] });
}

async function tradeAccept(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const tradeId = interaction.options.getString('tradeid');
  const trade   = getTrade(tradeId);

  if (!trade || trade.status !== 'pending') return interaction.reply({ content: '❌ Trade not found or already resolved.', ephemeral: true });
  if (trade.toId !== userId) return interaction.reply({ content: '❌ This trade is not for you.', ephemeral: true });

  const { profile: fromProfile, data } = getUserProfile(guildId, trade.fromId);
  const { profile: toProfile }         = getUserProfile(guildId, trade.toId);

  const fromIdx = fromProfile.pokemons.findIndex(p => p.uid === trade.fromPokemonUid);
  if (fromIdx === -1) return interaction.reply({ content: '❌ Sender no longer has that Pokémon.', ephemeral: true });

  const [fromMon] = fromProfile.pokemons.splice(fromIdx, 1);

  if (trade.toPokemonUid) {
    const toIdx = toProfile.pokemons.findIndex(p => p.uid === trade.toPokemonUid);
    if (toIdx === -1) return interaction.reply({ content: '❌ You no longer have that Pokémon.', ephemeral: true });
    const [toMon] = toProfile.pokemons.splice(toIdx, 1);
    fromProfile.pokemons.push(toMon);
  }

  toProfile.pokemons.push(fromMon);
  fromProfile.stats.tradesDone++;
  toProfile.stats.tradesDone++;

  data.users[guildId][trade.fromId] = fromProfile;
  data.users[guildId][trade.toId]   = toProfile;
  updateTrade(tradeId, { status: 'accepted' });
  saveData(data);

  const sp = getPokemonByDexId(fromMon.dexId);
  const embed = new EmbedBuilder()
    .setTitle('✅ Trade Complete!')
    .setDescription(`**${sp.name}** has been traded successfully!`)
    .setColor(0x00c851)
    .setImage(getSpriteUrl(fromMon.dexId));

  await interaction.reply({ embeds: [embed] });
}

async function tradeDecline(interaction) {
  const tradeId = interaction.options.getString('tradeid');
  const trade   = getTrade(tradeId);
  if (!trade || trade.status !== 'pending') return interaction.reply({ content: '❌ Trade not found.', ephemeral: true });
  if (trade.toId !== interaction.user.id)   return interaction.reply({ content: '❌ Not your trade.', ephemeral: true });
  updateTrade(tradeId, { status: 'declined' });
  await interaction.reply({ content: `❌ Trade \`${tradeId}\` declined.` });
}

async function tradeCancel(interaction) {
  const tradeId = interaction.options.getString('tradeid');
  const trade   = getTrade(tradeId);
  if (!trade || trade.status !== 'pending')   return interaction.reply({ content: '❌ Trade not found.', ephemeral: true });
  if (trade.fromId !== interaction.user.id)   return interaction.reply({ content: '❌ Not your trade.', ephemeral: true });
  updateTrade(tradeId, { status: 'cancelled' });
  await interaction.reply({ content: `🚫 Trade \`${tradeId}\` cancelled.` });
}

// ─── Profile / List / Info / Dex / Daily / Balance / Start ───────────────────
async function pokeStart(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const { profile, data } = getUserProfile(guildId, userId);

  if (profile.pokemons.length > 0) {
    return interaction.reply({ content: '✅ You already have a profile! Use `/poke profile` to view it.', ephemeral: true });
  }

  const STARTERS = [1, 4, 7];
  const dexId    = STARTERS[Math.floor(Math.random() * 3)];
  const species  = getPokemonByDexId(dexId);

  const starter = {
    uid: randomUUID().slice(0, 8), dexId,
    nickname: null, level: 5, xp: 0, shiny: false, createdAt: Date.now(),
  };

  profile.pokemons.push(starter);
  profile.credits = 500;
  profile.stats.caught = 1;
  data.users[guildId][userId] = profile;
  saveData(data);

  const embed = new EmbedBuilder()
    .setTitle('🌟 Welcome to PokéBot!')
    .setDescription(
      `Your starter is **${species.name}**!\n\n` +
      `**Commands:**\n` +
      `\`/poke catch <name>\` — Catch wild Pokémon\n` +
      `\`/poke list\` — View your collection\n` +
      `\`/poke duel @user\` — Battle!\n` +
      `\`/poke daily\` — Claim daily credits\n`
    )
    .setColor(POKE_COLOR)
    .setImage(getSpriteUrl(dexId))
    .setFooter({ text: `Types: ${species.types.join(' / ')}` });

  await interaction.reply({ embeds: [embed] });
}

async function pokeProfile(interaction) {
  const guildId    = interaction.guild.id;
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const { profile } = getUserProfile(guildId, targetUser.id);

  const recent = profile.pokemons.slice(-3).reverse();
  const recentLines = recent.map(p => {
    const sp = getPokemonByDexId(p.dexId);
    return `${sp?.name || '?'} Lv.${p.level}${p.shiny ? ' ✨' : ''}`;
  }).join('\n') || 'None';

  const latestSprite = recent[0] ? getSpriteUrl(recent[0].dexId) : null;

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.displayName}'s Pokémon Profile`)
    .setColor(POKE_COLOR)
    .addFields(
      { name: '💰 Credits',      value: `${profile.credits}`,           inline: true },
      { name: '📦 Total Caught', value: `${profile.stats.caught}`,      inline: true },
      { name: '✨ Shiny Caught', value: `${profile.stats.shinyCaught}`, inline: true },
      { name: '⚔️ Duels Won',   value: `${profile.stats.duelsWon}`,    inline: true },
      { name: '💀 Duels Lost',  value: `${profile.stats.duelsLost}`,   inline: true },
      { name: '🔄 Trades Done', value: `${profile.stats.tradesDone}`,  inline: true },
      { name: '🐾 Recent Pokémon', value: recentLines, inline: false },
    );

  if (latestSprite) embed.setThumbnail(latestSprite);
  await interaction.reply({ embeds: [embed] });
}

async function pokeList(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const page    = Math.max(1, interaction.options.getInteger('page') || 1);
  const { profile } = getUserProfile(guildId, userId);

  const PAGE_SIZE = 20;
  const total = profile.pokemons.length;
  const start = (page - 1) * PAGE_SIZE;
  const slice = profile.pokemons.slice(start, start + PAGE_SIZE);

  if (!slice.length) return interaction.reply({ content: '📭 No Pokémon on this page.', ephemeral: true });

  const lines = slice.map((p, i) => {
    const sp = getPokemonByDexId(p.dexId);
    return `\`${start + i + 1}.\` \`${p.uid}\` **${sp?.name || '?'}** Lv.${p.level}${p.shiny ? ' ✨' : ''}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`${interaction.user.displayName}'s Pokémon (${total} total)`)
    .setDescription(lines.join('\n'))
    .setColor(POKE_COLOR)
    .setFooter({ text: `Page ${page} / ${Math.ceil(total / PAGE_SIZE)}` });

  await interaction.reply({ embeds: [embed] });
}

async function pokeInfo(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const uid     = interaction.options.getString('uid');
  const { profile } = getUserProfile(guildId, userId);

  const instance = profile.pokemons.find(p => p.uid === uid);
  if (!instance) return interaction.reply({ content: '❌ Pokémon not found.', ephemeral: true });

  const sp       = getPokemonByDexId(instance.dexId);
  const required = getRequiredXpForLevel(instance.level);

  const embed = new EmbedBuilder()
    .setTitle(`${instance.nickname || sp.name}${instance.shiny ? ' ✨' : ''}`)
    .setColor(POKE_COLOR)
    .setImage(getSpriteUrl(instance.dexId))
    .addFields(
      { name: '🔢 Dex #',    value: `#${sp.dexId}`,                                    inline: true },
      { name: '🏷️ Types',   value: sp.types.join(' / '),                               inline: true },
      { name: '🏆 Level',    value: `${instance.level}`,                               inline: true },
      { name: '✨ XP',       value: `${instance.xp} / ${required}`,                   inline: true },
      { name: '🆔 UID',      value: `\`${instance.uid}\``,                             inline: true },
      { name: '📅 Caught',   value: `<t:${Math.floor(instance.createdAt / 1000)}:D>`,  inline: true },
    )
    .setFooter({ text: `HP:${sp.baseStats.hp} ATK:${sp.baseStats.atk} DEF:${sp.baseStats.def}` });

  await interaction.reply({ embeds: [embed] });
}

async function pokeDex(interaction) {
  const query = interaction.options.getString('query');
  const sp    = isNaN(query) ? getPokemonByName(query) : getPokemonByDexId(parseInt(query));

  if (!sp) return interaction.reply({ content: '❌ Pokémon not found in Pokédex.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle(`#${sp.dexId} — ${sp.name}`)
    .setColor(POKE_COLOR)
    .setImage(getSpriteUrl(sp.dexId))
    .addFields(
      { name: '🏷️ Types',   value: sp.types.join(' / '),                                                                                inline: true },
      { name: '❤️ HP',      value: `${sp.baseStats.hp}`,                                                                               inline: true },
      { name: '⚔️ ATK',    value: `${sp.baseStats.atk}`,                                                                              inline: true },
      { name: '🛡️ DEF',    value: `${sp.baseStats.def}`,                                                                              inline: true },
      { name: '🔮 Sp.ATK', value: `${sp.baseStats.spa}`,                                                                              inline: true },
      { name: '🔮 Sp.DEF', value: `${sp.baseStats.spd}`,                                                                              inline: true },
      { name: '💨 SPE',    value: `${sp.baseStats.spe}`,                                                                              inline: true },
      { name: '🌀 Evolves', value: sp.evolutions?.map(e => `→ #${e.to} at Lv.${e.level}`).join(', ') || 'Final form', inline: false },
    );

  await interaction.reply({ embeds: [embed] });
}

async function pokeDaily(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const { profile, data } = getUserProfile(guildId, userId);

  const now      = Date.now();
  const lastDaily = profile.cooldowns.daily || 0;
  const remaining = 24 * 60 * 60 * 1000 - (now - lastDaily);

  if (remaining > 0) {
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    return interaction.reply({ content: `⏳ Daily resets in **${h}h ${m}m**.`, ephemeral: true });
  }

  profile.credits += DAILY_REWARD;
  profile.cooldowns.daily = now;
  data.users[guildId][userId] = profile;
  saveData(data);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('💰 Daily Reward!')
      .setDescription(`You claimed **${DAILY_REWARD} credits**!\nBalance: **${profile.credits}**`)
      .setColor(0xffd700)],
  });
}

async function pokeBalance(interaction) {
  const { profile } = getUserProfile(interaction.guild.id, interaction.user.id);
  const inv = profile.inventory || {};
  const invLines = [
    inv.pokeball    ? `Pokéball x${inv.pokeball}`       : null,
    inv.greatball   ? `Greatball x${inv.greatball}`     : null,
    inv.ultraball   ? `Ultraball x${inv.ultraball}`     : null,
    inv.exp_candy_s ? `Exp Candy S x${inv.exp_candy_s}` : null,
    inv.exp_candy_m ? `Exp Candy M x${inv.exp_candy_m}` : null,
    inv.rename_tag  ? `Rename Tag x${inv.rename_tag}`   : null,
    inv.box_upgrade ? `Box Upgrade x${inv.box_upgrade}` : null,
    inv.evo_charm   ? `Evo Charm x${inv.evo_charm}`     : null,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle('💰 Balance')
    .setColor(0xffd700)
    .addFields(
      { name: '💳 Credits', value: `**${profile.credits}**`, inline: true },
      { name: '📦 Box', value: `${profile.pokemons.length} / ${profile.maxBoxSize || 100}`, inline: true },
    );

  if (invLines.length) embed.addFields({ name: '🎒 Items', value: invLines.join(' • '), inline: false });

  await interaction.reply({ embeds: [embed] });
}

// ─── Shop ─────────────────────────────────────────────────────────────────────
async function pokeShop(interaction) {
  const lines = Object.entries(SHOP_ITEMS).map(([key, item]) =>
    `\`${key}\` — **${item.label}** — ${item.price} credits\n↳ ${item.desc}`
  );
  const embed = new EmbedBuilder()
    .setTitle('🏪 Pokémon Shop')
    .setDescription(lines.join('\n\n'))
    .setColor(POKE_COLOR)
    .setFooter({ text: 'Use /poke buy <item> [amount] to purchase' });
  await interaction.reply({ embeds: [embed] });
}

// ─── Buy ──────────────────────────────────────────────────────────────────────
async function pokeBuy(interaction) {
  const guildId = interaction.guild.id;
  const userId  = interaction.user.id;
  const itemKey = interaction.options.getString('item');
  const amount  = Math.max(1, interaction.options.getInteger('amount') || 1);

  const shopItem = SHOP_ITEMS[itemKey];
  if (!shopItem) return interaction.reply({ content: '❌ Unknown item. Use `/poke shop` to see available items.', ephemeral: true });

  const { profile, data } = getUserProfile(guildId, userId);
  const totalCost = shopItem.price * amount;

  if (profile.credits < totalCost) {
    return interaction.reply({
      content: `❌ Not enough credits! Need **${totalCost}** but you have **${profile.credits}**.`,
      ephemeral: true,
    });
  }

  profile.credits -= totalCost;

  // box_upgrade is applied immediately, not stored in inventory
  if (itemKey === 'box_upgrade') {
    profile.maxBoxSize = (profile.maxBoxSize || 100) + 50 * amount;
    data.users[guildId][userId] = profile;
    saveData(data);
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📦 Box Upgraded!')
        .setDescription(`Spent **${totalCost} credits**.\nYour box now holds **${profile.maxBoxSize}** Pokémon!`)
        .setColor(POKE_COLOR)],
    });
  }

  addItem(profile, itemKey, amount);
  data.users[guildId][userId] = profile;
  saveData(data);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('✅ Purchase Successful!')
      .setDescription(`Bought **${shopItem.label} x${amount}** for **${totalCost} credits**.\nRemaining: **${profile.credits} credits**`)
      .setColor(0x00c851)],
  });
}

// ─── Item Use ─────────────────────────────────────────────────────────────────
async function pokeItemUse(interaction) {
  const guildId  = interaction.guild.id;
  const userId   = interaction.user.id;
  const itemType = interaction.options.getString('itemtype');
  const pokeUid  = interaction.options.getString('pokemonuid');
  const newName  = interaction.options.getString('newname') || null;

  const { profile, data } = getUserProfile(guildId, userId);
  const idx = profile.pokemons.findIndex(p => p.uid === pokeUid);
  if (idx === -1) return interaction.reply({ content: '❌ Pokémon not found.', ephemeral: true });

  const instance = profile.pokemons[idx];
  const sp = getPokemonByDexId(instance.dexId);

  if (itemType === 'exp_candy_s' || itemType === 'exp_candy_m') {
    if (!removeItem(profile, itemType, 1)) {
      return interaction.reply({ content: `❌ You don't have any **${SHOP_ITEMS[itemType].label}**!`, ephemeral: true });
    }
    const xpGain = itemType === 'exp_candy_s' ? 100 : 300;
    const leveled = addXpToPokemon(instance, xpGain);
    profile.pokemons[idx] = instance;
    data.users[guildId][userId] = profile;
    saveData(data);

    const embed = new EmbedBuilder()
      .setTitle(`🍬 ${SHOP_ITEMS[itemType].label} Used!`)
      .setDescription(
        `**${instance.nickname || sp.name}** received **+${xpGain} XP**!\n` +
        `Now: Level **${instance.level}** | XP: **${instance.xp}** / **${getRequiredXpForLevel(instance.level, instance.evoCharm)}**` +
        (leveled ? '\n🎉 **Leveled up!**' : '')
      )
      .setColor(POKE_COLOR)
      .setThumbnail(getSpriteUrl(instance.dexId));
    return interaction.reply({ embeds: [embed] });
  }

  if (itemType === 'rename_tag') {
    if (!newName) return interaction.reply({ content: '❌ Provide a new name with the `newname` option.', ephemeral: true });
    if (!removeItem(profile, 'rename_tag', 1)) {
      return interaction.reply({ content: `❌ You don't have any **Rename Tag**!`, ephemeral: true });
    }
    const oldName = instance.nickname || sp.name;
    instance.nickname = newName;
    profile.pokemons[idx] = instance;
    data.users[guildId][userId] = profile;
    saveData(data);
    return interaction.reply({ content: `✅ **${oldName}** has been renamed to **${newName}**!` });
  }

  if (itemType === 'evo_charm') {
    if (!removeItem(profile, 'evo_charm', 1)) {
      return interaction.reply({ content: `❌ You don't have any **Evolution Charm**!`, ephemeral: true });
    }
    instance.evoCharm = true;
    profile.pokemons[idx] = instance;
    data.users[guildId][userId] = profile;
    saveData(data);
    const embed = new EmbedBuilder()
      .setTitle('✨ Evolution Charm Applied!')
      .setDescription(`**${instance.nickname || sp.name}** now needs 20% less XP to evolve!`)
      .setColor(0x7b2fff)
      .setThumbnail(getSpriteUrl(instance.dexId));
    return interaction.reply({ embeds: [embed] });
  }

  return interaction.reply({ content: '❌ Unknown item type. Valid: `exp_candy_s`, `exp_candy_m`, `rename_tag`, `evo_charm`', ephemeral: true });
}

module.exports = {
  onMessageForSpawn,
  catchPokemon, evolvePokemon, duelPokemon,
  tradeStart, tradeAccept, tradeDecline, tradeCancel,
  pokeStart, pokeProfile, pokeList, pokeInfo, pokeDex,
  pokeDaily, pokeBalance,
  pokeShop, pokeBuy, pokeItemUse,
  addItem, removeItem,
};
