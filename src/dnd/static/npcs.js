const NPCS = {
  'director-kuro': {
    id: 'director-kuro', name: 'Director Kuro',
    cr: 8, hp: { current: 150, max: 150 }, ac: 15,
    stats: { str: 14, dex: 12, con: 16, int: 15, wis: 13, cha: 18 },
    abilities: [
      { name: 'Mass Charm', dice: '3d6', type: 'psychic', saveDC: 16, saveType: 'wis' },
      { name: 'Director\'s Cut', dice: '2d8+4', type: 'slashing' },
    ],
    immunities: [],
    description: 'Đạo diễn bí ẩn kiểm soát broadcast. CR8, CHA 18, Mass Charm DC16.',
  },
  'tv-god': {
    id: 'tv-god', name: 'TV God',
    cr: 18, hp: { current: 350, max: 350 }, ac: 17,
    stats: { str: 22, dex: 10, con: 20, int: 18, wis: 16, cha: 20 },
    abilities: [
      { name: 'Static Beam', dice: '10d10', type: 'lightning', aoe: true },
      { name: 'Broadcast Domination', dice: '5d8', type: 'psychic', saveDC: 20, saveType: 'wis' },
      { name: 'Channel Shift', dice: '3d12', type: 'force' },
    ],
    immunities: ['psychic', 'charm'],
    description: 'Boss cuối. CR18, immune psychic/charm. Static Beam 10d10.',
  },
};

module.exports = { NPCS };
