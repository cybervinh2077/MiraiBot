const { SlashCommandBuilder } = require('discord.js');
const engine = require('../../pokemon/pokemonEngine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poke')
    .setDescription('Pokémon system')
    // ── start ──
    .addSubcommand(s => s.setName('start').setDescription('Begin your Pokémon journey and receive a starter'))
    // ── catch ──
    .addSubcommand(s =>
      s.setName('catch').setDescription('Catch the wild Pokémon in this channel')
        .addStringOption(o => o.setName('name').setDescription('Pokémon name').setRequired(true))
    )
    // ── profile ──
    .addSubcommand(s =>
      s.setName('profile').setDescription('View your or another user\'s Pokémon profile')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(false))
    )
    // ── list ──
    .addSubcommand(s =>
      s.setName('list').setDescription('List your Pokémon collection')
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setRequired(false))
    )
    // ── info ──
    .addSubcommand(s =>
      s.setName('info').setDescription('View detailed info about one of your Pokémon')
        .addStringOption(o => o.setName('uid').setDescription('Pokémon UID').setRequired(true))
    )
    // ── dex ──
    .addSubcommand(s =>
      s.setName('dex').setDescription('Look up a Pokémon in the Pokédex')
        .addStringOption(o => o.setName('query').setDescription('Name or Dex ID').setRequired(true))
    )
    // ── evolve ──
    .addSubcommand(s =>
      s.setName('evolve').setDescription('Evolve one of your Pokémon')
        .addStringOption(o => o.setName('uid').setDescription('Pokémon UID').setRequired(true))
    )
    // ── duel ──
    .addSubcommand(s =>
      s.setName('duel').setDescription('Challenge another user to a Pokémon duel')
        .addUserOption(o => o.setName('user').setDescription('Opponent').setRequired(true))
    )
    // ── daily ──
    .addSubcommand(s => s.setName('daily').setDescription('Claim your daily credits'))
    // ── balance ──
    .addSubcommand(s => s.setName('balance').setDescription('Check your credit balance'))
    // ── trade subcommand group ──
    .addSubcommandGroup(g =>
      g.setName('trade').setDescription('Trade Pokémon with other players')
        .addSubcommand(s =>
          s.setName('start').setDescription('Initiate a trade')
            .addUserOption(o => o.setName('user').setDescription('Trade partner').setRequired(true))
            .addStringOption(o => o.setName('yourpokemon').setDescription('Your Pokémon UID').setRequired(true))
            .addStringOption(o => o.setName('theirpokemon').setDescription("Their Pokémon UID (optional)").setRequired(false))
        )
        .addSubcommand(s =>
          s.setName('accept').setDescription('Accept a trade')
            .addStringOption(o => o.setName('tradeid').setDescription('Trade ID').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('decline').setDescription('Decline a trade')
            .addStringOption(o => o.setName('tradeid').setDescription('Trade ID').setRequired(true))
        )
        .addSubcommand(s =>
          s.setName('cancel').setDescription('Cancel your pending trade')
            .addStringOption(o => o.setName('tradeid').setDescription('Trade ID').setRequired(true))
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const sub   = interaction.options.getSubcommand();

    try {
      // ── trade group ──────────────────────────────────────────────────────
      if (group === 'trade') {
        if (sub === 'start')   return await engine.tradeStart(interaction);
        if (sub === 'accept')  return await engine.tradeAccept(interaction);
        if (sub === 'decline') return await engine.tradeDecline(interaction);
        if (sub === 'cancel')  return await engine.tradeCancel(interaction);
      }

      // ── top-level subcommands ────────────────────────────────────────────
      switch (sub) {
        case 'start':   return await engine.pokeStart(interaction);
        case 'catch':   return await engine.catchPokemon(interaction);
        case 'profile': return await engine.pokeProfile(interaction);
        case 'list':    return await engine.pokeList(interaction);
        case 'info':    return await engine.pokeInfo(interaction);
        case 'dex':     return await engine.pokeDex(interaction);
        case 'evolve':  return await engine.evolvePokemon(interaction);
        case 'duel':    return await engine.duelPokemon(interaction);
        case 'daily':   return await engine.pokeDaily(interaction);
        case 'balance': return await engine.pokeBalance(interaction);
      }
    } catch (err) {
      console.error(`[poke/${group ? group + '.' : ''}${sub}]`, err);
      const msg = { content: '❌ An error occurred. Please try again.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};
