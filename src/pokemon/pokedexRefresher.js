/**
 * pokedexRefresher.js
 * Checks PokéAPI once a week (or on-demand) for new Pokémon.
 * If the remote count > local count, fetches only the new entries and appends them.
 * Reloads the in-memory dex cache in pokemonDex.js without restarting the bot.
 */

const fs   = require('fs');
const path = require('path');

const DEX_PATH  = path.join(__dirname, 'pokedex.json');
const BATCH     = 20;
const DELAY_MS  = 300;
const INTERVAL  = 7 * 24 * 60 * 60 * 1000; // 1 week

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Helpers (same logic as fetch-pokedex.js) ─────────────────────────────────

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseEvolutionChain(node, targetId, result = []) {
  const nodeId = parseInt(node.species.url.split('/').filter(Boolean).pop());
  if (nodeId === targetId) {
    for (const next of node.evolves_to) {
      const nextId   = parseInt(next.species.url.split('/').filter(Boolean).pop());
      const minLevel = next.evolution_details?.[0]?.min_level || 1;
      result.push({ to: nextId, level: minLevel });
    }
  } else {
    for (const next of node.evolves_to) parseEvolutionChain(next, targetId, result);
  }
  return result;
}

async function fetchOne(id) {
  try {
    const [pokeRes, speciesRes] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
      fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
    ]);
    if (!pokeRes.ok || !speciesRes.ok) return null;

    const poke    = await pokeRes.json();
    const species = await speciesRes.json();

    let evolutions = [];
    try {
      const chainRes = await fetch(species.evolution_chain.url);
      const chain    = await chainRes.json();
      evolutions = parseEvolutionChain(chain.chain, id);
    } catch {}

    const stats = {};
    for (const s of poke.stats) {
      const key = { hp:'hp', attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe' }[s.stat.name];
      if (key) stats[key] = s.base_stat;
    }

    return {
      dexId: poke.id,
      name:  capitalize(poke.name.replace(/-/g, ' ')),
      types: poke.types.map(t => capitalize(t.type.name)),
      baseStats: stats,
      sprite: poke.sprites.front_default ||
              `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`,
      evolutions,
    };
  } catch {
    return null;
  }
}

// ─── Core refresh logic ───────────────────────────────────────────────────────

async function getRemoteCount() {
  const res  = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1');
  const data = await res.json();
  return data.count; // total species in PokéAPI
}

function loadLocalDex() {
  if (!fs.existsSync(DEX_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(DEX_PATH, 'utf8')); }
  catch { return []; }
}

async function refreshDex(force = false) {
  console.log('[PokedexRefresher] Checking for updates...');

  let remoteCount;
  try {
    remoteCount = await getRemoteCount();
  } catch (err) {
    console.warn('[PokedexRefresher] Could not reach PokéAPI:', err.message);
    return false;
  }

  const local      = loadLocalDex();
  const localCount = local.length;

  if (!force && localCount >= remoteCount) {
    console.log(`[PokedexRefresher] Up to date (${localCount} Pokémon). No fetch needed.`);
    return false;
  }

  const newCount = remoteCount - localCount;
  console.log(`[PokedexRefresher] ${newCount} new Pokémon found (local: ${localCount}, remote: ${remoteCount}). Fetching...`);

  const existingIds = new Set(local.map(p => p.dexId));
  const toFetch     = Array.from({ length: remoteCount }, (_, i) => i + 1).filter(id => !existingIds.has(id));

  const newEntries = [];
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(fetchOne));
    for (const r of results) if (r) newEntries.push(r);
    if (i + BATCH < toFetch.length) await sleep(DELAY_MS);
  }

  if (!newEntries.length) {
    console.log('[PokedexRefresher] Nothing new fetched.');
    return false;
  }

  const merged = [...local, ...newEntries].sort((a, b) => a.dexId - b.dexId);
  fs.writeFileSync(DEX_PATH, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`[PokedexRefresher] ✅ Added ${newEntries.length} new Pokémon. Total: ${merged.length}`);

  // Reload in-memory cache in pokemonDex.js
  const dex = require('./pokemonDex');
  dex.reloadCache();

  return true;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function startScheduler() {
  // Run once at startup (non-blocking)
  refreshDex().catch(err => console.error('[PokedexRefresher] Startup check failed:', err));

  // Then repeat weekly
  setInterval(() => {
    refreshDex().catch(err => console.error('[PokedexRefresher] Weekly refresh failed:', err));
  }, INTERVAL);

  console.log('[PokedexRefresher] Scheduler started (weekly check).');
}

module.exports = { startScheduler, refreshDex };
