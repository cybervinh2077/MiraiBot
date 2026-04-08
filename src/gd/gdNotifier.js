/**
 * gdNotifier.js
 * Polls GD daily/weekly every 10 minutes, notifies configured channels
 */

const fs   = require('fs');
const path = require('path');
const { getDailyLevel, getWeeklyDemon } = require('./gdApi');
const { buildLevelEmbed } = require('../commands/gd/gd');
const { t } = require('../utils/i18n');

const STATE_PATH   = path.join(__dirname, '../../data/gd_notify_state.json');
const CONFIG_PATH  = path.join(__dirname, '../../data/gd_notify_config.json');
const POLL_INTERVAL = 10 * 60 * 1000; // 10 min

// ─── State ────────────────────────────────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return {}; }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

// ─── Config ───────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} GDNotifyConfig
 * @property {string} guildId
 * @property {string} channelId
 * @property {boolean} daily
 * @property {boolean} weekly
 */
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch { return {}; }
}
function saveConfig(c) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
}

function setNotifyConfig(guildId, channelId, daily = true, weekly = true) {
  const cfg = loadConfig();
  cfg[guildId] = { guildId, channelId, daily, weekly };
  saveConfig(cfg);
}

function removeNotifyConfig(guildId) {
  const cfg = loadConfig();
  delete cfg[guildId];
  saveConfig(cfg);
}

function getNotifyConfig(guildId) {
  return loadConfig()[guildId] || null;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
function startNotifier(client) {
  setInterval(() => pollAndNotify(client), POLL_INTERVAL);
  console.log('[GD Notifier] Started — polling every 10 min');
}

async function pollAndNotify(client) {
  const state  = loadState();
  const config = loadConfig();

  try {
    // Check daily
    const daily = await getDailyLevel();
    if (daily && daily.id !== state.lastDailyId) {
      state.lastDailyId = daily.id;
      for (const cfg of Object.values(config)) {
        if (!cfg.daily) continue;
        const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel) continue;
        const embed = buildLevelEmbed(cfg.guildId, daily);
        await channel.send({
          content: t(cfg.guildId, 'gd_notify_daily_new', { name: daily.name }),
          embeds: [embed],
        }).catch(() => {});
      }
    }

    // Check weekly
    const weekly = await getWeeklyDemon();
    if (weekly && weekly.id !== state.lastWeeklyId) {
      state.lastWeeklyId = weekly.id;
      for (const cfg of Object.values(config)) {
        if (!cfg.weekly) continue;
        const channel = await client.channels.fetch(cfg.channelId).catch(() => null);
        if (!channel) continue;
        const embed = buildLevelEmbed(cfg.guildId, weekly);
        await channel.send({
          content: t(cfg.guildId, 'gd_notify_weekly_new', { name: weekly.name }),
          embeds: [embed],
        }).catch(() => {});
      }
    }

    saveState(state);
  } catch (err) {
    console.error('[GD Notifier] Poll error:', err.message);
  }
}

module.exports = { startNotifier, setNotifyConfig, removeNotifyConfig, getNotifyConfig };
