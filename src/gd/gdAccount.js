/**
 * gdAccount.js
 * Link/unlink GD account ↔ Discord user
 * Stored in data/gd_accounts.json
 *
 * Verification method: user sets their GD profile comment/youtube to a code,
 * bot checks it. Simplified here: just store by trust (no verify step).
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/gd_accounts.json');

function load() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch { return {}; }
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * @typedef {Object} LinkedGDAccount
 * @property {string} discordId
 * @property {string} gdUsername
 * @property {string} gdAccountId
 * @property {number} linkedAt
 */

function linkAccount(discordId, gdUsername, gdAccountId) {
  const data = load();
  data[discordId] = { discordId, gdUsername, gdAccountId, linkedAt: Date.now() };
  save(data);
}

function unlinkAccount(discordId) {
  const data = load();
  delete data[discordId];
  save(data);
}

/** @returns {LinkedGDAccount | null} */
function getLinkedAccount(discordId) {
  return load()[discordId] || null;
}

/** Get all linked accounts for a guild (by member list) */
function getLinkedAccountsForGuild(memberIds) {
  const data = load();
  return memberIds.map(id => data[id]).filter(Boolean);
}

module.exports = { linkAccount, unlinkAccount, getLinkedAccount, getLinkedAccountsForGuild };
