/**
 * pokerState.js
 * In-memory state for solo poker sessions (one per guild+user)
 *
 * State shape:
 * {
 *   guildId, userId,
 *   difficulty: 'easy'|'hard',
 *   userStack, botStack,
 *   bigBlind, smallBlind,
 *   handNumber,
 *   // per-hand:
 *   deck, userHole, botHole,
 *   community,          // 0–5 cards revealed
 *   phase: 'preflop'|'flop'|'turn'|'river'|'showdown'|'idle',
 *   pot,
 *   userBet, botBet,    // amount bet this street
 *   dealer: 'user'|'bot',
 *   activePlayer: 'user'|'bot',
 *   lastMessageId,      // for editing player UI
 *   timeout,            // NodeJS timeout handle
 *   actionCount,        // actions this street (to detect check-check)
 * }
 */

// sessions: Map<`${guildId}:${userId}`, state>
const sessions = new Map();

function sessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getSession(guildId, userId) {
  return sessions.get(sessionKey(guildId, userId)) || null;
}

function setSession(guildId, userId, state) {
  sessions.set(sessionKey(guildId, userId), state);
}

function deleteSession(guildId, userId) {
  const key = sessionKey(guildId, userId);
  const s = sessions.get(key);
  if (s?.timeout) clearTimeout(s.timeout);
  sessions.delete(key);
}

function createSession(guildId, userId, difficulty = 'easy') {
  const state = {
    guildId, userId, difficulty,
    userStack: 1000, botStack: 1000,
    bigBlind: 20, smallBlind: 10,
    handNumber: 0,
    deck: [], userHole: [], botHole: [],
    community: [],
    phase: 'idle',
    pot: 0, userBet: 0, botBet: 0,
    dealer: 'user',   // user deals first hand
    activePlayer: 'user',
    lastMessageId: null,
    timeout: null,
    actionCount: 0,
  };
  setSession(guildId, userId, state);
  return state;
}

module.exports = { getSession, setSession, deleteSession, createSession };
