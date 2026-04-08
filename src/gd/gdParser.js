/**
 * gdParser.js
 * Parse raw Boomlings API response strings → JS objects
 *
 * GD uses two separator formats:
 *   key-value pairs: "1:value:2:value:3:value"  (sep = ':')
 *   list of objects: "obj1|obj2|obj3"            (sep = '|')
 *   user list:       "obj1:obj2:obj3"            (sep = ':')
 */

// ─── Raw key-value parser ─────────────────────────────────────────────────────
function parseKV(raw, sep = ':') {
  const parts = raw.split(sep);
  const obj = {};
  for (let i = 0; i < parts.length - 1; i += 2) {
    obj[parts[i]] = parts[i + 1];
  }
  return obj;
}

// ─── GDPlayer ─────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} GDPlayer
 * @property {string} accountId
 * @property {string} userId
 * @property {string} username
 * @property {number} stars
 * @property {number} demons
 * @property {number} diamonds
 * @property {number} coins
 * @property {number} userCoins
 * @property {number} creatorPoints
 * @property {number} rank
 * @property {number} modBadge  // 0=none, 1=mod, 2=elder mod
 * @property {string} youtube
 * @property {string} twitter
 * @property {string} twitch
 */

function parsePlayer(raw) {
  const kv = parseKV(raw);
  return {
    accountId:     kv['16'] || '',
    userId:        kv['2']  || '',
    username:      kv['1']  || 'Unknown',
    stars:         parseInt(kv['3']  || '0'),
    demons:        parseInt(kv['4']  || '0'),
    diamonds:      parseInt(kv['45'] || '0'),
    coins:         parseInt(kv['13'] || '0'),
    userCoins:     parseInt(kv['17'] || '0'),
    creatorPoints: parseInt(kv['8']  || '0'),
    rank:          parseInt(kv['30'] || '0'),
    modBadge:      parseInt(kv['49'] || '0'),
    youtube:       kv['20'] || '',
    twitter:       kv['44'] || '',
    twitch:        kv['45'] || '',
  };
}

function parsePlayerList(raw) {
  if (!raw || raw === '-1') return [];
  // getGJUsers20 returns list separated by '|'
  return raw.split('|').filter(Boolean).map(parsePlayer);
}

// ─── GDLevel ──────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} GDLevel
 * @property {number} id
 * @property {string} name
 * @property {string} description  // base64 decoded
 * @property {string} author
 * @property {number} stars
 * @property {number} difficulty   // 0=NA,1=easy,2=normal,3=hard,4=harder,5=insane,6=demon
 * @property {boolean} isDemon
 * @property {boolean} isAuto
 * @property {number} demonDifficulty // 3=easy,4=medium,0=hard,5=insane,6=extreme
 * @property {number} downloads
 * @property {number} likes
 * @property {number} length       // 0=tiny,1=short,2=medium,3=long,4=XL
 * @property {number} coins
 * @property {boolean} verifiedCoins
 * @property {number} objects
 * @property {string} songName
 * @property {number} songId
 * @property {boolean} isRated
 * @property {number} featuredScore
 * @property {boolean} isEpic
 */

function parseLevel(raw) {
  const kv = parseKV(raw);
  const isDemon = kv['17'] === '1';
  const isAuto  = kv['25'] === '1';

  let description = '';
  try {
    description = Buffer.from(kv['3'] || '', 'base64').toString('utf8');
  } catch { description = ''; }

  return {
    id:               parseInt(kv['1']  || '0'),
    name:             kv['2']  || 'Unknown',
    description,
    author:           kv['6']  || '',   // playerID, resolve separately
    stars:            parseInt(kv['18'] || '0'),
    difficulty:       parseInt(kv['9']  || '0'),
    isDemon,
    isAuto,
    demonDifficulty:  parseInt(kv['43'] || '0'),
    downloads:        parseInt(kv['10'] || '0'),
    likes:            parseInt(kv['14'] || '0'),
    length:           parseInt(kv['15'] || '0'),
    coins:            parseInt(kv['37'] || '0'),
    verifiedCoins:    kv['38'] === '1',
    objects:          parseInt(kv['45'] || '0'),
    songId:           parseInt(kv['35'] || kv['12'] || '0'),
    songName:         '',  // filled by caller if needed
    isRated:          parseInt(kv['18'] || '0') > 0,
    featuredScore:    parseInt(kv['19'] || '0'),
    isEpic:           kv['42'] === '1',
  };
}

function parseLevelList(raw) {
  if (!raw || raw === '-1') return [];
  // getGJLevels21 returns levels separated by '|', then '#' separates metadata
  const levelsPart = raw.split('#')[0];
  return levelsPart.split('|').filter(Boolean).map(parseLevel);
}

// ─── Difficulty helpers ───────────────────────────────────────────────────────
const DIFFICULTY_NAMES = ['NA', 'Easy', 'Normal', 'Hard', 'Harder', 'Insane', 'Demon'];
const DEMON_NAMES      = { 3: 'Easy Demon', 4: 'Medium Demon', 0: 'Hard Demon', 5: 'Insane Demon', 6: 'Extreme Demon' };
const LENGTH_NAMES     = ['Tiny', 'Short', 'Medium', 'Long', 'XL'];

function getDifficultyName(level) {
  if (level.isAuto)  return 'Auto';
  if (level.isDemon) return DEMON_NAMES[level.demonDifficulty] || 'Hard Demon';
  return DIFFICULTY_NAMES[level.difficulty] || 'NA';
}

function getLengthName(length) {
  return LENGTH_NAMES[length] || 'Unknown';
}

function getModBadgeName(badge) {
  if (badge === 2) return 'Elder Moderator';
  if (badge === 1) return 'Moderator';
  return null;
}

module.exports = {
  parseKV, parsePlayer, parsePlayerList,
  parseLevel, parseLevelList,
  getDifficultyName, getLengthName, getModBadgeName,
};
