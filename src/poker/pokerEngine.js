/**
 * pokerEngine.js
 * Texas Hold'em heads-up (user vs bot) — solo mode
 * CommonJS, no external dependencies
 */

// ─── Card constants ───────────────────────────────────────────────────────────
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['S','H','D','C']; // Spades, Hearts, Diamonds, Clubs

// Card image CDN — deckofcardsapi format: AS.png, KH.png, 2D.png, TC.png
const CARD_CDN = 'https://deckofcardsapi.com/static/img';

function cardImageUrl(code) {
  // code: e.g. 'AS', 'KH', '2D', 'TC'
  return `${CARD_CDN}/${code}.png`;
}

function cardBack() {
  return `${CARD_CDN}/back.png`;
}

// ─── Deck ─────────────────────────────────────────────────────────────────────
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(rank + suit);
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ─── Hand evaluation (simplified 7-card best 5) ───────────────────────────────
const HAND_RANK = {
  HIGH_CARD: 1, ONE_PAIR: 2, TWO_PAIR: 3, THREE_OF_A_KIND: 4,
  STRAIGHT: 5, FLUSH: 6, FULL_HOUSE: 7, FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9, ROYAL_FLUSH: 10,
};

function rankIndex(r) { return RANKS.indexOf(r); }

function evaluateHand(cards) {
  // cards: array of card codes e.g. ['AS','KH','QD','JC','TC','2S','3H']
  const ranks = cards.map(c => rankIndex(c[0]));
  const suits = cards.map(c => c[1]);

  const rankCount = {};
  for (const r of ranks) rankCount[r] = (rankCount[r] || 0) + 1;

  const suitCount = {};
  for (const s of suits) suitCount[s] = (suitCount[s] || 0) + 1;

  const counts = Object.values(rankCount).sort((a, b) => b - a);
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);

  const isFlush = Object.values(suitCount).some(c => c >= 5);
  const isStraight = checkStraight(uniqueRanks);

  if (isFlush && isStraight) {
    const flushSuit = Object.entries(suitCount).find(([, c]) => c >= 5)[0];
    const flushRanks = cards.filter(c => c[1] === flushSuit).map(c => rankIndex(c[0])).sort((a, b) => a - b);
    const isSF = checkStraight(flushRanks);
    if (isSF) {
      const highCard = Math.max(...flushRanks);
      return { rank: highCard === 12 ? HAND_RANK.ROYAL_FLUSH : HAND_RANK.STRAIGHT_FLUSH, highCard };
    }
  }
  if (counts[0] === 4) return { rank: HAND_RANK.FOUR_OF_A_KIND, highCard: Math.max(...ranks) };
  if (counts[0] === 3 && counts[1] === 2) return { rank: HAND_RANK.FULL_HOUSE, highCard: Math.max(...ranks) };
  if (isFlush) return { rank: HAND_RANK.FLUSH, highCard: Math.max(...ranks) };
  if (isStraight) return { rank: HAND_RANK.STRAIGHT, highCard: Math.max(...uniqueRanks) };
  if (counts[0] === 3) return { rank: HAND_RANK.THREE_OF_A_KIND, highCard: Math.max(...ranks) };
  if (counts[0] === 2 && counts[1] === 2) return { rank: HAND_RANK.TWO_PAIR, highCard: Math.max(...ranks) };
  if (counts[0] === 2) return { rank: HAND_RANK.ONE_PAIR, highCard: Math.max(...ranks) };
  return { rank: HAND_RANK.HIGH_CARD, highCard: Math.max(...ranks) };
}

function checkStraight(sortedRanks) {
  const unique = [...new Set(sortedRanks)];
  if (unique.length < 5) return false;
  // Check normal straight
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i + 4] - unique[i] === 4 &&
        unique[i+1] - unique[i] === 1 &&
        unique[i+2] - unique[i] === 2 &&
        unique[i+3] - unique[i] === 3) return true;
  }
  // Wheel: A-2-3-4-5
  if (unique.includes(12) && unique.includes(0) && unique.includes(1) && unique.includes(2) && unique.includes(3)) return true;
  return false;
}

function compareHands(h1, h2) {
  if (h1.rank !== h2.rank) return h1.rank > h2.rank ? 1 : -1;
  if (h1.highCard !== h2.highCard) return h1.highCard > h2.highCard ? 1 : -1;
  return 0; // tie
}

// ─── Hand strength estimate (0–1) for bot AI ─────────────────────────────────
function handStrength(holeCards, communityCards) {
  const all = [...holeCards, ...communityCards];
  const result = evaluateHand(all);
  // Normalize rank to 0–1
  return (result.rank - 1) / 9 + result.highCard / (9 * 13);
}

// ─── Bot AI ───────────────────────────────────────────────────────────────────
/**
 * Decide bot action
 * @param {object} state - current game state
 * @param {'easy'|'hard'} difficulty
 * @returns {{ action: 'fold'|'call'|'check'|'raise', amount: number }}
 */
function botDecide(state, difficulty = 'easy') {
  const { botHole, community, pot, botStack, callAmount, bigBlind } = state;
  const strength = handStrength(botHole, community);
  const rand = Math.random();

  if (difficulty === 'easy') {
    // Easy: mostly random with slight hand awareness
    if (callAmount === 0) {
      // Can check or bet
      if (rand < 0.6) return { action: 'check', amount: 0 };
      const betAmt = Math.min(bigBlind * 2, botStack);
      return { action: 'raise', amount: betAmt };
    }
    // Must call or fold
    if (rand < 0.3) return { action: 'fold', amount: 0 };
    if (rand < 0.8) return { action: 'call', amount: callAmount };
    const raiseAmt = Math.min(callAmount * 2, botStack);
    return { action: 'raise', amount: raiseAmt };
  }

  // Hard: hand-strength based
  if (callAmount === 0) {
    if (strength < 0.25) return { action: 'check', amount: 0 };
    if (strength < 0.55) {
      return rand < 0.5 ? { action: 'check', amount: 0 } : { action: 'raise', amount: bigBlind * 2 };
    }
    const betAmt = Math.min(Math.floor(pot * 0.6), botStack);
    return { action: 'raise', amount: Math.max(betAmt, bigBlind) };
  }

  // Facing a bet
  const potOdds = callAmount / (pot + callAmount);
  if (strength < potOdds * 0.8) return { action: 'fold', amount: 0 };
  if (strength < 0.5) return { action: 'call', amount: callAmount };
  if (strength > 0.7 && rand < 0.6) {
    const raiseAmt = Math.min(callAmount * 2 + Math.floor(pot * 0.3), botStack);
    return { action: 'raise', amount: Math.max(raiseAmt, callAmount + bigBlind) };
  }
  return { action: 'call', amount: callAmount };
}

// ─── Game flow helpers ────────────────────────────────────────────────────────
function dealHand(deck, pos) {
  return [deck[pos], deck[pos + 1]];
}

function getHandName(rank) {
  const names = {
    1: 'HIGH_CARD', 2: 'ONE_PAIR', 3: 'TWO_PAIR', 4: 'THREE_OF_A_KIND',
    5: 'STRAIGHT', 6: 'FLUSH', 7: 'FULL_HOUSE', 8: 'FOUR_OF_A_KIND',
    9: 'STRAIGHT_FLUSH', 10: 'ROYAL_FLUSH',
  };
  return names[rank] || 'HIGH_CARD';
}

module.exports = {
  createDeck, shuffle, dealHand,
  evaluateHand, compareHands, handStrength,
  botDecide, cardImageUrl, cardBack,
  getHandName, HAND_RANK,
};
