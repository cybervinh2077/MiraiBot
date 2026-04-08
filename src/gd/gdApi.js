/**
 * gdApi.js
 * Boomlings API wrapper — no personal API key needed
 * Uses fixed secret: Wmfd2893gb7
 *
 * All endpoints: POST https://www.boomlings.com/database/<endpoint>
 * Response: raw string, parsed by gdParser
 */

const { parsePlayerList, parsePlayer, parseLevelList, parseLevel } = require('./gdParser');

const BASE_URL    = 'https://www.boomlings.com/database';
const SECRET      = 'Wmfd2893gb7';
const TIMEOUT_MS  = 10_000;
const MAX_RETRIES = 2;

// ─── Per-user rate limiting (in-memory) ──────────────────────────────────────
const userCooldowns = new Map(); // userId → lastRequestTime
const COOLDOWN_MS   = 3_000;    // 3s between requests per user

function checkRateLimit(userId) {
  const last = userCooldowns.get(userId) || 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  userCooldowns.set(userId, Date.now());
  return true;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function postGD(endpoint, params, retries = 0) {
  const body = new URLSearchParams({ ...params, secret: SECRET });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'MiraiBot/1.0' },
      body: body.toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!text || text === '-1') return null;
    return text;
  } catch (err) {
    clearTimeout(timer);
    if (retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
      return postGD(endpoint, params, retries + 1);
    }
    throw err;
  }
}

// ─── API methods ──────────────────────────────────────────────────────────────

/**
 * Search players by username
 * @param {string} username
 * @returns {Promise<import('./gdParser').GDPlayer[]>}
 */
async function searchPlayer(username) {
  const raw = await postGD('getGJUsers20.php', {
    str: username, page: 0,
    gameVersion: 21, binaryVersion: 35,
  });
  return parsePlayerList(raw || '');
}

/**
 * Get player profile by accountID
 * @param {string} accountId
 * @returns {Promise<import('./gdParser').GDPlayer | null>}
 */
async function getPlayerByAccountId(accountId) {
  const raw = await postGD('getGJUserInfo20.php', {
    targetAccountID: accountId,
    gameVersion: 21, binaryVersion: 35,
  });
  if (!raw) return null;
  return parsePlayer(raw);
}

/**
 * Search levels
 * @param {string} query
 * @param {number} page
 * @param {number} type  // 0=search, 1=mostDownloaded, 2=mostLiked, 5=recent, 6=featured, 11=magic, 16=rated
 * @returns {Promise<import('./gdParser').GDLevel[]>}
 */
async function searchLevels(query, page = 0, type = 0) {
  const raw = await postGD('getGJLevels21.php', {
    str: query, page, type,
    gameVersion: 21, binaryVersion: 35,
  });
  return parseLevelList(raw || '');
}

/**
 * Get level by ID
 * @param {number} id
 * @returns {Promise<import('./gdParser').GDLevel | null>}
 */
async function getLevelById(id) {
  const raw = await postGD('getGJLevels21.php', {
    str: id, type: 0, page: 0,
    gameVersion: 21, binaryVersion: 35,
  });
  const levels = parseLevelList(raw || '');
  return levels.find(l => l.id === id) || null;
}

/**
 * Get daily level
 * @returns {Promise<import('./gdParser').GDLevel | null>}
 */
async function getDailyLevel() {
  const raw = await postGD('getGJDailyLevel.php', {
    weekly: 0,
    gameVersion: 21, binaryVersion: 35,
  });
  if (!raw) return null;
  // Response: "levelID|timeLeft" or just levelID
  const levelId = parseInt(raw.split('|')[0]);
  if (!levelId || levelId < 0) return null;
  return getLevelById(levelId);
}

/**
 * Get weekly demon
 * @returns {Promise<import('./gdParser').GDLevel | null>}
 */
async function getWeeklyDemon() {
  const raw = await postGD('getGJDailyLevel.php', {
    weekly: 1,
    gameVersion: 21, binaryVersion: 35,
  });
  if (!raw) return null;
  const levelId = parseInt(raw.split('|')[0]);
  if (!levelId || levelId < 0) return null;
  return getLevelById(levelId);
}

/**
 * Get top leaderboard
 * @param {'top'|'creators'|'friends'} type
 * @param {number} count
 * @returns {Promise<import('./gdParser').GDPlayer[]>}
 */
async function getLeaderboard(type = 'top', count = 100) {
  const typeMap = { top: 1, creators: 2, friends: 0 };
  const raw = await postGD('getGJScores20.php', {
    type: typeMap[type] ?? 1, count,
    gameVersion: 21, binaryVersion: 35,
  });
  return parsePlayerList(raw || '');
}

/**
 * Get moderator list (players with modBadge > 0)
 * Fetches top leaderboard and filters — GD has no dedicated mod endpoint
 * @returns {Promise<import('./gdParser').GDPlayer[]>}
 */
async function getModeratorList() {
  const players = await getLeaderboard('top', 100);
  return players.filter(p => p.modBadge > 0);
}

module.exports = {
  checkRateLimit,
  searchPlayer, getPlayerByAccountId,
  searchLevels, getLevelById,
  getDailyLevel, getWeeklyDemon,
  getLeaderboard, getModeratorList,
};
