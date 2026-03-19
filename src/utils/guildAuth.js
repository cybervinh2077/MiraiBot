const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'sessions.enc');
const ALGORITHM = 'aes-256-cbc';

function getKey() {
  const key = process.env.ENCRYPT_KEY || '';
  // Pad hoặc truncate về đúng 32 bytes
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function loadSessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) return new Map();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const decrypted = decrypt(raw);
    return new Map(Object.entries(JSON.parse(decrypted)));
  } catch (err) {
    console.error('⚠️  Failed to load sessions:', err.message);
    return new Map();
  }
}

function saveSessions(map) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const json = JSON.stringify(Object.fromEntries(map));
    fs.writeFileSync(DATA_FILE, encrypt(json), 'utf8');
  } catch (err) {
    console.error('⚠️  Failed to save sessions:', err.message);
  }
}

// Load vào memory khi khởi động
const guildSessions = loadSessions();

function isGuildAuthed(guildId) {
  return guildSessions.has(guildId);
}

function setGuildAuth(guildId, userInfo) {
  guildSessions.set(guildId, {
    ...userInfo,
    linkedAt: new Date().toISOString(),
  });
  saveSessions(guildSessions);
}

function getGuildAuth(guildId) {
  return guildSessions.get(guildId);
}

function clearGuildAuth(guildId) {
  guildSessions.delete(guildId);
  saveSessions(guildSessions);
}

module.exports = { isGuildAuthed, setGuildAuth, getGuildAuth, clearGuildAuth };
