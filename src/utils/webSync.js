const API_URL = process.env.API_URL;
const API_KEY = process.env.API_KEY;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function post(action, dataType, data) {
  if (!API_URL || !API_KEY) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({ action, dataType, data }),
    });
    if (!res.ok) console.warn(`[webSync] ${action}/${dataType} → HTTP ${res.status}`);
  } catch (err) {
    console.error(`[webSync] ${action}/${dataType} error:`, err.message);
  }
}

// ─── Sync servers + members ───────────────────────────────────────────────────
async function syncServers(client) {
  const guilds = client.guilds.cache.map(guild => ({
    id:          guild.id,
    name:        guild.name,
    icon:        guild.iconURL(),
    memberCount: guild.memberCount,
    members:     guild.members.cache
      .filter(m => !m.user.bot)
      .map(m => ({
        id:          m.user.id,
        username:    m.user.username,
        displayName: m.displayName,
        avatar:      m.user.avatarURL(),
        roles:       m.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name),
      })),
  }));

  await post('sync-bot-data', 'servers', guilds);
  console.log(`[webSync] Synced ${guilds.length} server(s)`);
}

// ─── Sync bot stats ───────────────────────────────────────────────────────────
async function syncStats(client) {
  const stats = {
    botId:       client.user.id,
    botTag:      client.user.tag,
    avatar:      client.user.avatarURL(),
    guildCount:  client.guilds.cache.size,
    userCount:   client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
    uptime:      Math.floor(client.uptime / 1000), // seconds
    ping:        client.ws.ping,
    syncedAt:    new Date().toISOString(),
  };

  await post('sync-bot-data', 'stats', stats);
}

// ─── Sync music queue state ───────────────────────────────────────────────────
async function syncMusicState(client) {
  try {
    const { getQueue } = require('./musicManager');
    const musicData = client.guilds.cache.map(guild => {
      const queue = getQueue(guild.id);
      if (!queue) return { guildId: guild.id, active: false };
      return {
        guildId:   guild.id,
        active:    true,
        current:   queue.current ? { title: queue.current.title, url: queue.current.url, duration: queue.current.duration, thumbnail: queue.current.thumbnail } : null,
        queueSize: queue.songs.length,
        filter:    queue.filter || 'default',
        volume:    Math.round(queue.volume * 100),
        loop:      queue.loop,
        loopQueue: queue.loopQueue,
      };
    });

    await post('sync-bot-data', 'music', musicData);
  } catch {
    // musicManager chưa load hoặc không có queue — bỏ qua
  }
}

// ─── Full sync (gọi tất cả) ───────────────────────────────────────────────────
async function fullSync(client) {
  await Promise.allSettled([
    syncServers(client),
    syncStats(client),
    syncMusicState(client),
  ]);
}

// ─── Start scheduler ──────────────────────────────────────────────────────────
function startWebSync(client) {
  if (!API_URL || !API_KEY) {
    console.warn('[webSync] API_URL or API_KEY not set — web sync disabled');
    return;
  }

  // Sync ngay khi ready
  fullSync(client);

  // Sync servers + stats mỗi 5 phút
  setInterval(() => fullSync(client), 5 * 60 * 1000);

  console.log('[webSync] Scheduler started (every 5 min)');
}

module.exports = { startWebSync, fullSync, syncServers, syncStats, syncMusicState };
