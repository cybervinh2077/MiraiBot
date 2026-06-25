/**
 * osuAccount.js
 * Link/unlink tài khoản osu! ↔ Discord user.
 * Lưu ở data/osu_accounts.json (theo mẫu gdAccount).
 */

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/osu_accounts.json');

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

function linkAccount(discordId, osuUsername, osuUserId, mode = 'osu') {
  const data = load();
  data[discordId] = { discordId, osuUsername, osuUserId, mode, linkedAt: Date.now() };
  save(data);
}

function unlinkAccount(discordId) {
  const data = load();
  delete data[discordId];
  save(data);
}

function getLinkedAccount(discordId) {
  return load()[discordId] || null;
}

module.exports = { linkAccount, unlinkAccount, getLinkedAccount };
