const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_PATH = path.join(__dirname, '../../data/pokemon.enc');

function loadData() {
  try {
    if (!fs.existsSync(DATA_PATH)) return { users: {}, spawns: {}, trades: {} };
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return { users: {}, spawns: {}, trades: {} };
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── User profile ─────────────────────────────────────────────────────────────
const DEFAULT_PROFILE = () => ({
  credits: 0,
  pokemons: [],
  maxBoxSize: 100,
  inventory: {
    pokeball: 0, greatball: 0, ultraball: 0,
    exp_candy_s: 0, exp_candy_m: 0,
    rename_tag: 0, box_upgrade: 0, evo_charm: 0,
  },
  stats: { caught: 0, shinyCaught: 0, duelsWon: 0, duelsLost: 0, tradesDone: 0 },
  cooldowns: { daily: 0 },
});

function getUserProfile(guildId, userId) {
  const data = loadData();
  if (!data.users[guildId]) data.users[guildId] = {};
  if (!data.users[guildId][userId]) data.users[guildId][userId] = DEFAULT_PROFILE();
  const profile = data.users[guildId][userId];
  // migrate old profiles
  if (!profile.inventory) profile.inventory = DEFAULT_PROFILE().inventory;
  if (profile.maxBoxSize == null) profile.maxBoxSize = 100;
  return { profile, data };
}

function setUserProfile(guildId, userId, profile) {
  const data = loadData();
  if (!data.users[guildId]) data.users[guildId] = {};
  data.users[guildId][userId] = profile;
  saveData(data);
}

// ─── Spawns ───────────────────────────────────────────────────────────────────
function getSpawn(channelId) {
  return loadData().spawns[channelId] || null;
}

function setSpawn(channelId, spawn) {
  const data = loadData();
  data.spawns[channelId] = spawn;
  saveData(data);
}

function clearSpawn(channelId) {
  const data = loadData();
  delete data.spawns[channelId];
  saveData(data);
}

// ─── Trades ───────────────────────────────────────────────────────────────────
function createTrade(tradeData) {
  const data = loadData();
  const tradeId = randomUUID().slice(0, 8).toUpperCase();
  data.trades[tradeId] = { ...tradeData, createdAt: Date.now() };
  saveData(data);
  return tradeId;
}

function getTrade(tradeId) {
  return loadData().trades[tradeId] || null;
}

function updateTrade(tradeId, patch) {
  const data = loadData();
  if (!data.trades[tradeId]) return;
  Object.assign(data.trades[tradeId], patch);
  saveData(data);
}

module.exports = {
  loadData, saveData,
  getUserProfile, setUserProfile,
  getSpawn, setSpawn, clearSpawn,
  createTrade, getTrade, updateTrade,
};
