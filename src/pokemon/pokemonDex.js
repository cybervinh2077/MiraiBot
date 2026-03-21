const path = require('path');
const fs   = require('fs');

// pokedex.json should be placed at src/pokemon/pokedex.json
// Format: array of { dexId, name, types, baseStats, sprite, evolutions }
const DEX_PATH = path.join(__dirname, 'pokedex.json');

let _dex = null;
function getDex() {
  if (!_dex) {
    if (!fs.existsSync(DEX_PATH)) {
      console.warn('[PokeDex] pokedex.json not found at', DEX_PATH);
      _dex = [];
    } else {
      _dex = JSON.parse(fs.readFileSync(DEX_PATH, 'utf8'));
    }
  }
  return _dex;
}

/** Force reload the in-memory cache (called by pokedexRefresher after update) */
function reloadCache() {
  _dex = null;
  getDex(); // re-populate immediately
  console.log(`[PokeDex] Cache reloaded — ${_dex.length} Pokémon loaded.`);
}

function getRandomPokemon() {
  const dex = getDex();
  return dex[Math.floor(Math.random() * dex.length)];
}

function getPokemonByDexId(dexId) {
  return getDex().find(p => p.dexId === dexId) || null;
}

function getPokemonByName(name) {
  const lower = name.toLowerCase();
  const dex = getDex();
  return (
    dex.find(p => p.name.toLowerCase() === lower) ||
    dex.find(p => p.name.toLowerCase().includes(lower)) ||
    null
  );
}

// Returns evolution targets the pokemon can evolve into at currentLevel
function getEvolutionTargets(dexId, currentLevel) {
  const mon = getPokemonByDexId(dexId);
  if (!mon || !mon.evolutions) return [];
  return mon.evolutions.filter(e => currentLevel >= e.level);
}

function getSpriteUrl(dexId) {
  const mon = getPokemonByDexId(dexId);
  if (mon?.sprite) return mon.sprite;
  // Fallback to PokeAPI sprites CDN
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;
}

module.exports = { getRandomPokemon, getPokemonByDexId, getPokemonByName, getEvolutionTargets, getSpriteUrl, reloadCache };
