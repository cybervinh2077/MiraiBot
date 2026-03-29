const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const { t } = require('../../utils/i18n');
const {
  createDeck, shuffle, dealHand,
  evaluateHand, compareHands,
  botDecide, cardImageUrl, cardBack,
  getHandName,
} = require('../../poker/pokerEngine');
const {
  getSession, setSession, deleteSession, createSession,
} = require('../../poker/pokerState');

const TIMEOUT_MS = 60_000; // 60s per action

// ─── Slash command definition ─────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('poker')
    .setDescription('Texas Hold\'em Poker — Solo mode (1 vs Bot)')
    // /poker solo start [difficulty]
    .addSubcommandGroup(g =>
      g.setName('solo').setDescription('Solo mode — you vs bot')
        .addSubcommand(s =>
          s.setName('start').setDescription('Start a new solo poker session')
            .addStringOption(o =>
              o.setName('difficulty').setDescription('Bot difficulty')
                .setRequired(false)
                .addChoices(
                  { name: '😊 Easy', value: 'easy' },
                  { name: '😤 Hard', value: 'hard' },
                )
            )
        )
        .addSubcommand(s => s.setName('stop').setDescription('End your current poker session'))
        .addSubcommand(s => s.setName('info').setDescription('View current session info'))
    ),

  // ─── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction) {
    const g   = interaction.guild.id;
    const uid = interaction.user.id;
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'start')  return await cmdStart(interaction, g, uid);
      if (sub === 'stop')   return await cmdStop(interaction, g, uid);
      if (sub === 'info')   return await cmdInfo(interaction, g, uid);
    } catch (err) {
      console.error('[poker]', err);
      const msg = { content: t(g, 'poker_error_generic'), ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
      else await interaction.reply(msg);
    }
  },
};

// ─── /poker solo start ────────────────────────────────────────────────────────
async function cmdStart(interaction, g, uid) {
  const existing = getSession(g, uid);
  if (existing) {
    return interaction.reply({ content: t(g, 'poker_already_running'), ephemeral: true });
  }

  const difficulty = interaction.options.getString('difficulty') || 'easy';
  const state = createSession(g, uid, difficulty);

  await interaction.reply({
    embeds: [buildSessionEmbed(g, state, interaction.user)],
    ephemeral: false,
  });

  // Start first hand automatically
  await startHand(interaction.channel, g, uid, state);
}

// ─── /poker solo stop ─────────────────────────────────────────────────────────
async function cmdStop(interaction, g, uid) {
  const state = getSession(g, uid);
  if (!state) {
    return interaction.reply({ content: t(g, 'poker_not_in_game'), ephemeral: true });
  }
  deleteSession(g, uid);
  await interaction.reply({
    content: t(g, 'poker_session_ended', {
      user: interaction.user.toString(),
      userStack: state.userStack,
      botStack: state.botStack,
      hands: state.handNumber,
    }),
  });
}

// ─── /poker solo info ─────────────────────────────────────────────────────────
async function cmdInfo(interaction, g, uid) {
  const state = getSession(g, uid);
  if (!state) {
    return interaction.reply({ content: t(g, 'poker_not_in_game'), ephemeral: true });
  }
  await interaction.reply({
    embeds: [buildSessionEmbed(g, state, interaction.user)],
    ephemeral: true,
  });
}

// ─── Start a new hand ─────────────────────────────────────────────────────────
async function startHand(channel, g, uid, state) {
  // Check stacks
  if (state.userStack <= 0) return endSession(channel, g, uid, state, 'bot');
  if (state.botStack <= 0)  return endSession(channel, g, uid, state, 'user');

  state.handNumber++;
  state.deck = shuffle(createDeck());
  state.userHole = dealHand(state.deck, 0);
  state.botHole  = dealHand(state.deck, 2);
  state.community = [];
  state.phase = 'preflop';
  state.pot = 0; state.userBet = 0; state.botBet = 0;
  state.actionCount = 0;

  // Post blinds — dealer posts SB, other posts BB
  const userIsDealer = state.dealer === 'user';
  const userSB = userIsDealer;

  const sbAmt = Math.min(state.smallBlind, userIsDealer ? state.userStack : state.botStack);
  const bbAmt = Math.min(state.bigBlind,   userIsDealer ? state.botStack  : state.userStack);

  if (userIsDealer) {
    state.userStack -= sbAmt; state.userBet = sbAmt;
    state.botStack  -= bbAmt; state.botBet  = bbAmt;
  } else {
    state.botStack  -= sbAmt; state.botBet  = sbAmt;
    state.userStack -= bbAmt; state.userBet = bbAmt;
  }
  state.pot = sbAmt + bbAmt;

  // Pre-flop: dealer (SB) acts first
  state.activePlayer = userIsDealer ? 'user' : 'bot';
  setSession(g, uid, state);

  // Send hand start message
  const handMsg = await channel.send({
    content: t(g, 'poker_hand_start', {
      handNumber: state.handNumber,
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      dealer: userIsDealer ? t(g, 'poker_you') : t(g, 'poker_bot'),
    }),
    embeds: [buildTableEmbed(g, state)],
  });

  // Send user hole cards (ephemeral not possible from channel.send, use DM or visible)
  await channel.send({
    content: t(g, 'poker_your_cards', { user: `<@${uid}>` }),
    files: state.userHole.map(c => cardImageUrl(c)),
  });

  if (state.activePlayer === 'bot') {
    await doBotTurn(channel, g, uid, state);
  } else {
    await sendUserActionUI(channel, g, uid, state);
  }
}

// ─── User action UI ───────────────────────────────────────────────────────────
async function sendUserActionUI(channel, g, uid, state) {
  const callAmt = Math.max(0, state.botBet - state.userBet);
  const canCheck = callAmt === 0;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`poker_fold_${uid}`)
      .setLabel(t(g, 'poker_action_fold'))
      .setStyle(ButtonStyle.Danger),
    canCheck
      ? new ButtonBuilder()
          .setCustomId(`poker_check_${uid}`)
          .setLabel(t(g, 'poker_action_check'))
          .setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder()
          .setCustomId(`poker_call_${uid}`)
          .setLabel(t(g, 'poker_action_call', { amount: callAmt }))
          .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`poker_raise_${uid}`)
      .setLabel(t(g, 'poker_action_raise'))
      .setStyle(ButtonStyle.Success),
  );

  const msg = await channel.send({
    content: t(g, 'poker_your_turn', { user: `<@${uid}>`, pot: state.pot }),
    components: [row],
  });

  state.lastMessageId = msg.id;

  // Auto-fold timeout
  if (state.timeout) clearTimeout(state.timeout);
  state.timeout = setTimeout(async () => {
    const s = getSession(g, uid);
    if (!s || s.activePlayer !== 'user') return;
    await msg.edit({ content: t(g, 'poker_timeout_fold'), components: [] }).catch(() => {});
    await channel.send(t(g, 'poker_timeout_fold_notice', { user: `<@${uid}>` }));
    await processAction(channel, g, uid, s, 'fold', 0);
  }, TIMEOUT_MS);

  setSession(g, uid, state);
}

// ─── Bot turn ─────────────────────────────────────────────────────────────────
async function doBotTurn(channel, g, uid, state) {
  // Small delay for realism
  await new Promise(r => setTimeout(r, 1200));

  const callAmt = Math.max(0, state.userBet - state.botBet);
  const decision = botDecide({
    botHole: state.botHole,
    community: state.community,
    pot: state.pot,
    botStack: state.botStack,
    callAmount: callAmt,
    bigBlind: state.bigBlind,
  }, state.difficulty);

  let msgKey, msgVars;
  switch (decision.action) {
    case 'fold':
      msgKey = 'poker_bot_fold'; msgVars = {};
      break;
    case 'check':
      msgKey = 'poker_bot_check'; msgVars = {};
      break;
    case 'call':
      msgKey = 'poker_bot_call'; msgVars = { amount: Math.min(callAmt, state.botStack) };
      break;
    case 'raise':
      msgKey = 'poker_bot_raise'; msgVars = { amount: decision.amount };
      break;
  }

  await channel.send(t(g, msgKey, msgVars));
  await processAction(channel, g, uid, state, decision.action, decision.amount);
}

// ─── Process action (user or bot) ────────────────────────────────────────────
async function processAction(channel, g, uid, state, action, raiseAmount = 0) {
  if (state.timeout) { clearTimeout(state.timeout); state.timeout = null; }

  const actor = state.activePlayer;

  if (action === 'fold') {
    const winner = actor === 'user' ? 'bot' : 'user';
    if (winner === 'user') state.userStack += state.pot;
    else state.botStack += state.pot;
    await channel.send(t(g, 'poker_fold_win', {
      winner: winner === 'user' ? `<@${uid}>` : t(g, 'poker_bot'),
      pot: state.pot,
    }));
    state.pot = 0;
    setSession(g, uid, state);
    return scheduleNextHand(channel, g, uid, state);
  }

  if (action === 'check') {
    state.actionCount++;
    // Both checked → advance street
    if (state.actionCount >= 2) {
      return advanceStreet(channel, g, uid, state);
    }
    state.activePlayer = actor === 'user' ? 'bot' : 'user';
    setSession(g, uid, state);
    if (state.activePlayer === 'bot') return doBotTurn(channel, g, uid, state);
    return sendUserActionUI(channel, g, uid, state);
  }

  if (action === 'call') {
    const callAmt = actor === 'user'
      ? Math.min(Math.max(0, state.botBet - state.userBet), state.userStack)
      : Math.min(Math.max(0, state.userBet - state.botBet), state.botStack);

    if (actor === 'user') { state.userStack -= callAmt; state.userBet += callAmt; }
    else                  { state.botStack  -= callAmt; state.botBet  += callAmt; }
    state.pot += callAmt;
    state.actionCount++;
    // After call, advance street
    return advanceStreet(channel, g, uid, state);
  }

  if (action === 'raise') {
    const totalBet = actor === 'user'
      ? Math.min(state.userBet + raiseAmount, state.userStack + state.userBet)
      : Math.min(state.botBet  + raiseAmount, state.botStack  + state.botBet);

    const added = actor === 'user'
      ? Math.min(totalBet - state.userBet, state.userStack)
      : Math.min(totalBet - state.botBet,  state.botStack);

    if (actor === 'user') { state.userStack -= added; state.userBet += added; }
    else                  { state.botStack  -= added; state.botBet  += added; }
    state.pot += added;
    state.actionCount = 1; // reset — opponent must respond

    state.activePlayer = actor === 'user' ? 'bot' : 'user';
    setSession(g, uid, state);
    if (state.activePlayer === 'bot') return doBotTurn(channel, g, uid, state);
    return sendUserActionUI(channel, g, uid, state);
  }
}

// ─── Advance street ───────────────────────────────────────────────────────────
async function advanceStreet(channel, g, uid, state) {
  // Collect bets into pot (already done in processAction)
  state.userBet = 0; state.botBet = 0;
  state.actionCount = 0;

  const deckOffset = 4; // 2 user + 2 bot

  if (state.phase === 'preflop') {
    state.community = [state.deck[deckOffset], state.deck[deckOffset+1], state.deck[deckOffset+2]];
    state.phase = 'flop';
  } else if (state.phase === 'flop') {
    state.community.push(state.deck[deckOffset+3]);
    state.phase = 'turn';
  } else if (state.phase === 'turn') {
    state.community.push(state.deck[deckOffset+4]);
    state.phase = 'river';
  } else if (state.phase === 'river') {
    return doShowdown(channel, g, uid, state);
  }

  // Post-flop: non-dealer acts first
  state.activePlayer = state.dealer === 'user' ? 'bot' : 'user';
  setSession(g, uid, state);

  await channel.send({
    content: t(g, 'poker_street_' + state.phase, { pot: state.pot }),
    files: state.community.map(c => cardImageUrl(c)),
    embeds: [buildTableEmbed(g, state)],
  });

  if (state.activePlayer === 'bot') return doBotTurn(channel, g, uid, state);
  return sendUserActionUI(channel, g, uid, state);
}

// ─── Showdown ─────────────────────────────────────────────────────────────────
async function doShowdown(channel, g, uid, state) {
  state.phase = 'showdown';
  const all = [...state.community];

  const userResult = evaluateHand([...state.userHole, ...all]);
  const botResult  = evaluateHand([...state.botHole,  ...all]);
  const cmp = compareHands(userResult, botResult);

  const userHandName = t(g, 'poker_hand_' + getHandName(userResult.rank));
  const botHandName  = t(g, 'poker_hand_' + getHandName(botResult.rank));

  let winnerText;
  if (cmp > 0) {
    state.userStack += state.pot;
    winnerText = t(g, 'poker_showdown_user_wins', { user: `<@${uid}>`, hand: userHandName, pot: state.pot });
  } else if (cmp < 0) {
    state.botStack += state.pot;
    winnerText = t(g, 'poker_showdown_bot_wins', { hand: botHandName, pot: state.pot });
  } else {
    const half = Math.floor(state.pot / 2);
    state.userStack += half; state.botStack += half;
    winnerText = t(g, 'poker_showdown_tie', { pot: state.pot });
  }

  state.pot = 0;

  const embed = new EmbedBuilder()
    .setTitle(t(g, 'poker_showdown_title'))
    .setColor(0xffd700)
    .addFields(
      { name: t(g, 'poker_your_hand'),  value: `${state.userHole.join(' ')} → **${userHandName}**`, inline: true },
      { name: t(g, 'poker_bot_hand'),   value: `${state.botHole.join(' ')}  → **${botHandName}**`,  inline: true },
      { name: t(g, 'poker_community'),  value: state.community.join(' '),                            inline: false },
    );

  await channel.send({
    content: winnerText,
    embeds: [embed],
    files: [...state.botHole.map(c => cardImageUrl(c))],
  });

  setSession(g, uid, state);
  scheduleNextHand(channel, g, uid, state);
}

// ─── Schedule next hand ───────────────────────────────────────────────────────
function scheduleNextHand(channel, g, uid, state) {
  if (state.userStack <= 0 || state.botStack <= 0) {
    return endSession(channel, g, uid, state, state.userStack > 0 ? 'user' : 'bot');
  }
  // Rotate dealer
  state.dealer = state.dealer === 'user' ? 'bot' : 'user';
  setSession(g, uid, state);

  setTimeout(async () => {
    const s = getSession(g, uid);
    if (!s) return;
    await channel.send(t(g, 'poker_next_hand', { handNumber: s.handNumber + 1 }));
    await startHand(channel, g, uid, s);
  }, 4000);
}

// ─── End session ─────────────────────────────────────────────────────────────
async function endSession(channel, g, uid, state, winner) {
  deleteSession(g, uid);
  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(t(g, 'poker_game_over_title'))
      .setColor(winner === 'user' ? 0x00c851 : 0xff4444)
      .setDescription(t(g, winner === 'user' ? 'poker_game_over_user_wins' : 'poker_game_over_bot_wins', {
        user: `<@${uid}>`,
        hands: state.handNumber,
      }))],
  });
}

// ─── Embeds ───────────────────────────────────────────────────────────────────
function buildSessionEmbed(g, state, user) {
  return new EmbedBuilder()
    .setTitle(t(g, 'poker_session_title'))
    .setColor(0x2ecc71)
    .addFields(
      { name: t(g, 'poker_player'),     value: user.displayName,          inline: true },
      { name: t(g, 'poker_difficulty'), value: t(g, 'poker_diff_' + state.difficulty), inline: true },
      { name: t(g, 'poker_your_stack'), value: `${state.userStack}`,      inline: true },
      { name: t(g, 'poker_bot_stack'),  value: `${state.botStack}`,       inline: true },
      { name: t(g, 'poker_blinds'),     value: `${state.smallBlind}/${state.bigBlind}`, inline: true },
    );
}

function buildTableEmbed(g, state) {
  return new EmbedBuilder()
    .setTitle(t(g, 'poker_table_title', { phase: t(g, 'poker_phase_' + state.phase) }))
    .setColor(0x1a6b3c)
    .addFields(
      { name: t(g, 'poker_pot'),        value: `${state.pot}`,        inline: true },
      { name: t(g, 'poker_your_stack'), value: `${state.userStack}`,  inline: true },
      { name: t(g, 'poker_bot_stack'),  value: `${state.botStack}`,   inline: true },
      { name: t(g, 'poker_hand_num'),   value: `#${state.handNumber}`, inline: true },
    );
}

// Export internal for interactionCreate handler
module.exports._processAction = processAction;
