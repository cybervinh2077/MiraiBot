const path = require('path');
const { saveEncrypted, loadEncrypted } = require('./encryption');

function getSavePath(guildId) {
  return path.join(__dirname, '../../data/dnd/saves', `${guildId}.enc`);
}

async function loadState(guildId) {
  return await loadEncrypted(getSavePath(guildId));
}

async function saveState(guildId, state) {
  state.updatedAt = new Date().toISOString();
  await saveEncrypted(getSavePath(guildId), state);
}

function createFreshState(guildId) {
  return {
    guildId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode: 'multiplayer',
    campaign: {
      active: true,
      currentChannel: 1,
      signal: { current: 10, max: 20 },
      phase: 'exploration',
    },
    party: [],
    soloPlayer: null,
    aiMinions: [],
    quests: {
      main: [
        { id: 'q1', name: 'Pilot Studio', complete: false, xp: 900 },
        { id: 'q2', name: 'Static News Cleared', complete: false, xp: 1200 },
        { id: 'q3', name: 'Cooking Channel', complete: false, xp: 1500 },
        { id: 'q4', name: 'Sports Arena', complete: false, xp: 2000 },
        { id: 'q5', name: 'Idol Stage', complete: false, xp: 2000 },
        { id: 'q6', name: 'Mecha Bay', complete: false, xp: 2500 },
        { id: 'q7', name: 'Romance Arc', complete: false, xp: 2200 },
        { id: 'q8', name: 'Defeat TV God', complete: false, xp: 50000 },
      ],
      side: [
        { id: 's1', name: 'Ad Collector', progress: 0, goal: 5, complete: false, xp: 300 },
        { id: 's2', name: 'Viewer Rebellion', progress: 0, goal: 3, complete: false, xp: 500 },
        { id: 's3', name: 'Signal Booster', progress: 0, goal: 10, complete: false, xp: 800 },
      ],
    },
    combat: { active: false, turnOrder: [], currentTurn: 0, enemies: [] },
    autoCombat: false,
    log: [],
  };
}

module.exports = { loadState, saveState, createFreshState, getSavePath };
