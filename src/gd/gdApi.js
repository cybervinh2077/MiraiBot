/**
 * gdApi.js
 * Uses GDBrowser API (https://gdbrowser.com/api) — free, no key needed, returns JSON
 * Daily/Weekly: GDBrowser /api/daily|weekly bị block bởi RobTop
 * → Fallback dùng Boomlings API trực tiếp với headers GD client
 */

const BASE = 'https://gdbrowser.com/api';
const TIMEOUT_MS  = 12_000;
const MAX_RETRIES = 2;

// ─── Per-user rate limiting ───────────────────────────────────────────────────
const userCooldowns = new Map();
const COOLDOWN_MS   = 3_000;

function checkRateLimit(userId) {
  const last = userCooldowns.get(userId) || 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  userCooldowns.set(userId, Date.now());
  return true;
}

// ─── GDBrowser GET helper ─────────────────────────────────────────────────────
async function get(path, retries = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'User-Agent': 'MiraiBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text === '-1' || text.trim() === '') return null;
    try { return JSON.parse(text); } catch { return null; }
  } catch (err) {
    clearTimeout(timer);
    if (retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 1000 * (retries + 1)));
      return get(path, retries + 1);
    }
    throw err;
  }
}

// ─── Player ───────────────────────────────────────────────────────────────────
/**
 * Search player by username
 * GDBrowser: GET /api/search/<username>?type=users
 * Returns array of player objects
 */
async function searchPlayer(username) {
  const data = await get(`/search/${encodeURIComponent(username)}?type=users`);
  if (!data) return [];
  // GDBrowser returns { results: [...] } or array directly
  const list = Array.isArray(data) ? data : (data.results || data.users || [data]);
  return list.filter(Boolean).map(mapPlayer);
}

/**
 * Get player profile by username (direct profile endpoint)
 * GDBrowser: GET /api/profile/<username>
 */
async function getPlayerProfile(username) {
  const data = await get(`/profile/${encodeURIComponent(username)}`);
  if (!data) return null;
  return mapPlayer(data);
}

function mapPlayer(d) {
  return {
    accountId:     String(d.accountID || d.accountId || ''),
    userId:        String(d.playerID  || d.userID    || ''),
    username:      d.username || d.name || 'Unknown',
    stars:         parseInt(d.stars         || 0),
    demons:        parseInt(d.demons        || 0),
    diamonds:      parseInt(d.diamonds      || 0),
    coins:         parseInt(d.coins         || 0),
    userCoins:     parseInt(d.userCoins     || 0),
    creatorPoints: parseInt(d.cp || d.creatorPoints || 0),
    rank:          parseInt(d.globalRank    || d.rank || 0),
    modBadge:      parseInt(d.moderator     || d.modBadge || 0),
    youtube:       d.youtube  || '',
    twitter:       d.twitter  || '',
    twitch:        d.twitch   || '',
  };
}

// ─── Level ────────────────────────────────────────────────────────────────────
/**
 * Search levels by name or ID
 * GDBrowser: GET /api/search/<query>
 */
async function searchLevels(query, page = 0) {
  const data = await get(`/search/${encodeURIComponent(query)}?page=${page}`);
  if (!data) return [];
  const list = Array.isArray(data) ? data : (data.results || data.levels || []);
  return list.filter(Boolean).map(mapLevel);
}

/**
 * Get level by ID
 * GDBrowser: GET /api/level/<id>
 */
async function getLevelById(id) {
  const data = await get(`/level/${id}`);
  if (!data) return null;
  return mapLevel(data);
}

function mapLevel(d) {
  return {
    id:              parseInt(d.id || 0),
    name:            d.name || 'Unknown',
    description:     d.description || '',
    author:          d.author || d.creatorName || '',
    stars:           parseInt(d.stars    || 0),
    difficulty:      d.difficulty || 'N/A',
    isDemon:         !!d.demon,
    isAuto:          !!d.auto,
    demonDifficulty: d.demonDifficulty || '',
    downloads:       parseInt(d.downloads || 0),
    likes:           parseInt(d.likes     || 0),
    length:          d.length || 'Unknown',
    coins:           parseInt(d.coins     || 0),
    verifiedCoins:   !!d.verifiedCoins,
    objects:         parseInt(d.objects   || 0),
    songId:          parseInt(d.songID    || d.songId || 0),
    songName:        d.songName || '',
    isRated:         parseInt(d.stars || 0) > 0,
    featuredScore:   parseInt(d.featured  || 0),
    isEpic:          !!d.epic,
    orbs:            parseInt(d.orbs      || 0),
  };
}

// ─── Daily / Weekly cache ─────────────────────────────────────────────────────
const dailyCache  = { level: null, expiresAt: 0 };
const weeklyCache = { level: null, expiresAt: 0 };
const DAILY_TTL   = 23 * 60 * 60 * 1000;  // 23h
const WEEKLY_TTL  = 6  * 24 * 60 * 60 * 1000; // 6 days

async function scrapeLevelId(page) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://gdbrowser.com/${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/\((\d{6,})\)/);
    return match ? parseInt(match[1]) : null;
  } catch (err) {
    clearTimeout(timer);
    return null;
  }
}

async function getDailyLevel() {
  if (dailyCache.level && Date.now() < dailyCache.expiresAt) return dailyCache.level;
  const id = await scrapeLevelId('daily');
  if (!id) return dailyCache.level || null; // return stale if available
  const level = await getLevelById(id);
  if (level) { dailyCache.level = level; dailyCache.expiresAt = Date.now() + DAILY_TTL; }
  return level;
}

async function getWeeklyDemon() {
  if (weeklyCache.level && Date.now() < weeklyCache.expiresAt) return weeklyCache.level;
  const id = await scrapeLevelId('weekly');
  if (!id) return weeklyCache.level || null;
  const level = await getLevelById(id);
  if (level) { weeklyCache.level = level; weeklyCache.expiresAt = Date.now() + WEEKLY_TTL; }
  return level;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
/**
 * GDBrowser: GET /api/leaderboard?count=<n>&type=<type>
 * type: 'top' | 'creators'
 */
async function getLeaderboard(type = 'top', count = 10) {
  const gdType = type === 'creators' ? 'creators' : 'top';
  const data = await get(`/leaderboard?count=${count}&type=${gdType}`);
  if (!data) return [];
  const list = Array.isArray(data) ? data : [];
  return list.map(mapPlayer);
}

/**
 * Moderator list — GDBrowser không có dedicated endpoint
 * Fetch profile của danh sách mod đã biết từ community
 * Ref: https://gdcolon.com/gd/mods (không có API)
 */
const KNOWN_MODS = [
  'RobTop','Colon','Wulzy','Viprin','Knobbelboy','Npesta','Sunix',
  'Riot','Dorami','Serponge','Michigun','Manix648','Zobros','Cyclic',
  'Alkali','Cvolton','Spu7nix','Woogi1411','Pennutoh','Giron',
];

async function getModeratorList() {
  const results = await Promise.allSettled(
    KNOWN_MODS.map(name => getPlayerProfile(name))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value?.modBadge > 0)
    .map(r => r.value);
}

module.exports = {
  checkRateLimit,
  searchPlayer, getPlayerProfile,
  searchLevels, getLevelById,
  getDailyLevel, getWeeklyDemon,
  getLeaderboard, getModeratorList,
};
