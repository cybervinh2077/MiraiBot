/**
 * osuApi.js
 * Wrapper cho osu! API v2 (OAuth2 client credentials).
 *
 * Cần đăng ký OAuth app tại https://osu.ppy.sh/home/account/edit (mục "OAuth")
 * và điền OSU_CLIENT_ID + OSU_CLIENT_SECRET vào .env.
 */

const OSU_TOKEN_URL = 'https://osu.ppy.sh/oauth/token';
const OSU_API       = 'https://osu.ppy.sh/api/v2';

const VALID_MODES = ['osu', 'taiko', 'fruits', 'mania'];

// ─── Token cache (client credentials) ──────────────────────────────────────────
let _token = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const clientId     = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[osu] OSU_CLIENT_ID hoặc OSU_CLIENT_SECRET chưa được set trong .env');
    return null;
  }

  try {
    const res = await fetch(OSU_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'public',
      }),
    });
    const data = await res.json();
    if (!data.access_token) {
      console.error('[osu] Lấy token thất bại:', JSON.stringify(data).slice(0, 200));
      return null;
    }
    _token = data.access_token;
    _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return _token;
  } catch (err) {
    console.error('[osu] Lỗi lấy token:', err.message);
    return null;
  }
}

function isConfigured() {
  return !!(process.env.OSU_CLIENT_ID && process.env.OSU_CLIENT_SECRET);
}

// ─── Generic GET ────────────────────────────────────────────────────────────────
async function apiGet(endpoint, params = {}) {
  const token = await getToken();
  if (!token) return null;

  const url = new URL(OSU_API + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error(`[osu] API ${endpoint} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[osu] Lỗi gọi ${endpoint}:`, err.message);
    return null;
  }
}

// ─── Endpoints ──────────────────────────────────────────────────────────────────
function normalizeMode(mode) {
  return VALID_MODES.includes(mode) ? mode : 'osu';
}

/** Lấy thông tin user theo username (key=username để tránh nhầm với id) */
async function getUser(username, mode = 'osu') {
  return apiGet(`/users/${encodeURIComponent(username)}/${normalizeMode(mode)}`, { key: 'username' });
}

/**
 * Lấy scores của user.
 * @param {string|number} userId
 * @param {'best'|'recent'|'firsts'} type
 */
async function getUserScores(userId, type = 'best', mode = 'osu', limit = 5) {
  const data = await apiGet(`/users/${userId}/scores/${type}`, {
    mode: normalizeMode(mode),
    limit,
    include_fails: type === 'recent' ? 1 : 0,
  });
  return Array.isArray(data) ? data : [];
}

/** Lấy thông tin 1 beatmap (difficulty) theo id */
async function getBeatmap(beatmapId) {
  return apiGet(`/beatmaps/${beatmapId}`);
}

// ─── Rate limit per user (2s) ───────────────────────────────────────────────────
const _rate = new Map();
function checkRateLimit(uid, ms = 2000) {
  const now = Date.now();
  if (now - (_rate.get(uid) || 0) < ms) return false;
  _rate.set(uid, now);
  return true;
}

module.exports = {
  isConfigured,
  getUser,
  getUserScores,
  getBeatmap,
  checkRateLimit,
  VALID_MODES,
};
