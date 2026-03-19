const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

function deriveKey(secret) {
  return crypto.scryptSync(secret, 'echoes-broadcast-salt-v1', 32);
}

function encrypt(dataObject, secret) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const json = JSON.stringify(dataObject);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

function decrypt(encryptedStr, secret) {
  const key = deriveKey(secret);
  const [ivHex, authTagHex, dataHex] = encryptedStr.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function saveEncrypted(filePath, dataObject) {
  const secret = process.env.ENCRYPT_KEY;
  const encrypted = encrypt(dataObject, secret);
  const tmpPath = filePath + '.tmp';
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, encrypted, 'utf8');
  await fs.rename(tmpPath, filePath);
}

async function loadEncrypted(filePath) {
  try {
    const secret = process.env.ENCRYPT_KEY;
    const raw = await fs.readFile(filePath, 'utf8');
    return decrypt(raw, secret);
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt, saveEncrypted, loadEncrypted };
