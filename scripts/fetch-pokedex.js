/**
 * fetch-pokedex.js
 * Fetches full Pokédex data from PokéAPI and writes to src/pokemon/pokedex.json
 * Run once: node scripts/fetch-pokedex.js
 *
 * Requires Node 18+ (native fetch) or node-fetch
 */

const fs   = require('fs');
const path = require('path');

const OUT_PATH  = path.join(__dirname, '../src/pokemon/pokedex.json');
const TOTAL     = 898;   // Gen 1–8 (change to 1010 for Gen 9)
const BATCH     = 20;    // concurrent requests per batch
const DELAY_MS  = 300;   // ms between batches (be nice to PokéAPI)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPokemon(id) {
  const [pokeRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  if (!pokeRes.ok || !speciesRes.ok) {
    console.warn(`  ⚠️  Skipping #${id} (HTTP ${pokeRes.status}/${speciesRes.status})`);
    return null;
  }

  const poke    = await pokeRes.json();
  const species = await speciesRes.json();

  // Evolution chain — fetch separately
  let evolutions = [];
  try {
    const chainRes  = await fetch(species.evolution_chain.url);
    const chainData = await chainRes.json();
    evolutions = parseEvolutionChain(chainData.chain, id);
  } catch {}

  const stats = {};
  for (const s of poke.stats) {
    const key = {
      hp:              'hp',
      attack:          'atk',
      defense:         'def',
      'special-attack':'spa',
      'special-defense':'spd',
      speed:           'spe',
    }[s.stat.name];
    if (key) stats[key] = s.base_stat;
  }

  return {
    dexId:  poke.id,
    name:   capitalize(poke.name.replace(/-/g, ' ')),
    types:  poke.types.map(t => capitalize(t.type.name)),
    baseStats: stats,
    sprite: poke.sprites.front_default ||
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png`,
    evolutions,
  };
}

/** Walk the evolution chain tree and return direct next evolutions for a given dexId */
function parseEvolutionChain(node, targetId, result = []) {
  const nodeId = parseInt(node.species.url.split('/').filter(Boolean).pop());

  if (nodeId === targetId) {
    for (const next of node.evolves_to) {
      const nextId    = parseInt(next.species.url.split('/').filter(Boolean).pop());
      const minLevel  = next.evolution_details?.[0]?.min_level || null;
      result.push({ to: nextId, level: minLevel || 1 });
    }
  } else {
    for (const next of node.evolves_to) {
      parseEvolutionChain(next, targetId, result);
    }
  }
  return result;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function main() {
  console.log(`🔄 Fetching ${TOTAL} Pokémon from PokéAPI...`);
  const results = [];
  let failed = 0;

  for (let start = 1; start <= TOTAL; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TOTAL);
    process.stdout.write(`  Batch ${start}–${end}... `);

    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) => fetchPokemon(start + i))
    );

    for (const entry of batch) {
      if (entry) results.push(entry);
      else failed++;
    }

    console.log(`✅ (${results.length} ok, ${failed} failed)`);
    if (end < TOTAL) await sleep(DELAY_MS);
  }

  results.sort((a, b) => a.dexId - b.dexId);
  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n✅ Done! ${results.length} Pokémon written to:\n   ${OUT_PATH}`);
  if (failed) console.warn(`⚠️  ${failed} entries failed — re-run to retry.`);
}

main().catch(err => { console.error(err); process.exit(1); });
