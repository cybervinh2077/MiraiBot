const fs   = require('fs');
const path = require('path');

// levels.enc nằm trong src/data/ cùng với các file data khác
const DATA_PATH = path.join(__dirname, '../data/levels.enc');

function loadLevels() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveLevels(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getUserData(guildId, userId) {
  const all = loadLevels();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) all[guildId][userId] = { xp: 0, level: 0, lastMessage: 0 };
  return { data: all[guildId][userId], all };
}

function setUserData(guildId, userId, userData) {
  const all = loadLevels();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][userId] = userData;
  saveLevels(all);
}

module.exports = { loadLevels, saveLevels, getUserData, setUserData };
