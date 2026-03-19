const CHARACTERS = {
  kai: {
    id: 'kai', name: 'Kai Static', kit: 'samurai',
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    hp: { current: 12, max: 12 }, charges: { current: 3, max: 3 },
    xp: 0, level: 1, statusEffects: [],
    ability: { id: 'slash-burst', name: 'Slash Burst', dice: '3d8', type: 'slashing' },
    backstory: 'Cựu viewer nghiện samurai show, tìm "perfect episode".',
  },
  miko: {
    id: 'miko', name: 'Miko Glitch', kit: 'witch',
    stats: { str: 8, dex: 12, con: 13, int: 17, wis: 14, cha: 10 },
    hp: { current: 10, max: 10 }, charges: { current: 4, max: 4 },
    xp: 0, level: 1, statusEffects: [],
    ability: { id: 'glitch-bolt', name: 'Glitch Bolt', dice: '2d10', type: 'psychic' },
    backstory: 'Hacker TV signal từ thế giới thật, ghét loop.',
  },
  reno: {
    id: 'reno', name: 'Reno Skip', kit: 'rogue',
    stats: { str: 10, dex: 18, con: 14, int: 12, wis: 13, cha: 12 },
    hp: { current: 10, max: 10 }, charges: { current: 3, max: 3 },
    xp: 0, level: 1, statusEffects: [],
    ability: { id: 'ad-trap', name: 'Ad Trap', dice: '2d6', type: 'sneak', addStat: 'dex' },
    backstory: 'Ad salesman, dùng commercial trap để sống sót.',
  },
  dj: {
    id: 'dj', name: 'DJ Volume', kit: 'bard',
    stats: { str: 9, dex: 13, con: 12, int: 11, wis: 10, cha: 16 },
    hp: { current: 9, max: 9 }, charges: { current: 5, max: 5 },
    xp: 0, level: 1, statusEffects: [],
    ability: { id: 'soundwave', name: 'Soundwave AoE', dice: '1d8', type: 'thunder', addStat: 'cha', aoe: true },
    backstory: 'DJ underground, dùng soundwave phá broadcast.',
  },
};

module.exports = { CHARACTERS };
