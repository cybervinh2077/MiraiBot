const crypto = require('crypto');

// ── Dice ──────────────────────────────────────────────────────────────────────
function rollDice(notation) {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { total: 0, rolls: [], modifier: 0, notation };
  const count = parseInt(match[1]);
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;
  const rolls = Array.from({ length: count }, () =>
    crypto.randomInt(1, sides + 1)
  );
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { total, rolls, modifier, notation };
}

function roll1d20() {
  return crypto.randomInt(1, 21);
}

function statMod(stat) {
  return Math.floor((stat - 10) / 2);
}

// ── Level ─────────────────────────────────────────────────────────────────────
const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000];

function calculateLevel(xp) {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  level = Math.min(level, 12);
  const xpCurrent = xp - XP_THRESHOLDS[level - 1];
  const xpForNext = level < 12 ? XP_THRESHOLDS[level] - XP_THRESHOLDS[level - 1] : 0;
  const progress = xpForNext > 0 ? Math.floor((xpCurrent / xpForNext) * 100) : 100;
  return { level, xpForNext, xpCurrent, progress };
}

// ── Combat ────────────────────────────────────────────────────────────────────
function applyDamage(state, targetId, damage) {
  const member = state.party.find(p => p.userId === targetId || p.id === targetId);
  if (!member) return { downed: false, newHp: 0 };
  member.hp.current = Math.max(0, member.hp.current - damage);
  return { downed: member.hp.current <= 0, newHp: member.hp.current };
}

function updateSignal(state, delta) {
  const sig = state.campaign.signal;
  sig.current = Math.max(0, Math.min(sig.max, sig.current + delta));
  let effect = null;
  if (sig.current >= 15) effect = 'buff';
  else if (sig.current <= 5 && sig.current > 0) effect = 'debuff';
  else if (sig.current === 0) effect = 'critical';
  return { newSignal: sig.current, effect };
}

function checkLevelUp(character) {
  const before = calculateLevel(character.xp - (character._lastXpGain || 0));
  const after = calculateLevel(character.xp);
  if (after.level > before.level) {
    const hpIncrease = crypto.randomInt(1, 7) + statMod(character.stats.con);
    character.hp.max += Math.max(1, hpIncrease);
    character.hp.current += Math.max(1, hpIncrease);
    character.level = after.level;
    return { leveled: true, oldLevel: before.level, newLevel: after.level, hpIncrease };
  }
  character.level = after.level;
  return { leveled: false, oldLevel: before.level, newLevel: after.level, hpIncrease: 0 };
}

// ── Solo / AI ─────────────────────────────────────────────────────────────────
function generateAIMinion(baseChar, ratio = 0.7) {
  const minion = JSON.parse(JSON.stringify(baseChar));
  minion.name = `[AI] ${baseChar.name}`;
  minion.isMinion = true;
  minion.aiControlled = true;
  minion.hp.max = Math.max(1, Math.floor(baseChar.hp.max * ratio));
  minion.hp.current = minion.hp.max;
  minion.charges.max = Math.max(1, Math.floor(baseChar.charges.max * ratio));
  minion.charges.current = minion.charges.max;
  return minion;
}

function aiMinionAction(minion, enemies, state) {
  const alive = enemies.filter(e => e.hp.current > 0);
  if (!alive.length) return { action: 'idle', target: null, roll: 0, damage: 0, narrative: `${minion.name} menunggu...` };

  // Focus fire: target HP terendah
  const target = alive.reduce((a, b) => a.hp.current < b.hp.current ? a : b);
  const hitRoll = roll1d20() + statMod(minion.stats.dex);
  const ac = target.ac || 12;

  if (hitRoll < ac) {
    return {
      action: 'miss', target: target.name, roll: hitRoll, damage: 0,
      narrative: `${minion.name} tấn công ${target.name}! 🎲 ${hitRoll} — **Miss!**`,
    };
  }

  const dmgResult = rollDice(minion.ability.dice);
  let bonus = 0;
  if (minion.ability.addStat) bonus = statMod(minion.stats[minion.ability.addStat]);
  const damage = Math.max(1, dmgResult.total + bonus);
  target.hp.current = Math.max(0, target.hp.current - damage);

  return {
    action: 'attack', target: target.name, roll: hitRoll, damage,
    narrative: `${minion.name} dùng **${minion.ability.name}** vào ${target.name}! 🎲 ${hitRoll} hit! ${minion.ability.dice} = **${damage} ${minion.ability.type} damage!**`,
  };
}

const CHANNEL_ENCOUNTERS = {
  1: { enemies: ['Zombie Reporter', 'Static Drone'], baseHp: 8, ac: 10, xp: 150 },
  2: { enemies: ['News Anchor Ghost', 'Teleprompter Golem'], baseHp: 12, ac: 11, xp: 200 },
  3: { enemies: ['Rogue Chef Bot', 'Food Critic Specter'], baseHp: 14, ac: 12, xp: 250 },
  4: { enemies: ['Sports Fanatic', 'Referee Wraith'], baseHp: 16, ac: 12, xp: 300 },
  5: { enemies: ['Idol Puppet', 'Stage Light Elemental'], baseHp: 18, ac: 13, xp: 350 },
  6: { enemies: ['Mecha Drone', 'Pilot Ghost'], baseHp: 22, ac: 14, xp: 400 },
  7: { enemies: ['Romance Specter', 'Drama Queen'], baseHp: 20, ac: 13, xp: 380 },
  8: { enemies: ['TV God Shard', 'Broadcast Demon'], baseHp: 40, ac: 16, xp: 1000 },
};

function generateEncounter(channelId, playerLevel) {
  const template = CHANNEL_ENCOUNTERS[channelId] || CHANNEL_ENCOUNTERS[1];
  const count = Math.min(2 + Math.floor(playerLevel / 3), 4);
  const hpScale = 1 + (playerLevel - 1) * 0.15;

  const enemies = Array.from({ length: count }, (_, i) => {
    const name = template.enemies[i % template.enemies.length];
    const hp = Math.floor(template.baseHp * hpScale);
    return { id: `enemy_${i}`, name: `${name} ${i + 1}`, hp: { current: hp, max: hp }, ac: template.ac, xpReward: template.xp };
  });

  const narratives = [
    `Màn hình tĩnh rung lên — **${enemies.map(e => e.name).join(', ')}** xuất hiện từ nhiễu sóng!`,
    `Tín hiệu méo tiếng — **${enemies[0].name}** và đồng bọn lao ra!`,
    `Broadcast bị gián đoạn! **${enemies.map(e => e.name).join(' & ')}** chặn đường!`,
  ];

  return {
    enemies,
    narrative: narratives[crypto.randomInt(0, narratives.length)],
    difficulty: playerLevel <= 3 ? 'easy' : playerLevel <= 6 ? 'medium' : 'hard',
    xpTotal: enemies.reduce((a, e) => a + e.xpReward, 0),
  };
}

function avgPartyLevel(party) {
  if (!party.length) return 1;
  return Math.round(party.reduce((a, p) => a + (p.level || 1), 0) / party.length);
}

module.exports = {
  rollDice, calculateLevel, applyDamage, updateSignal,
  checkLevelUp, generateAIMinion, aiMinionAction,
  generateEncounter, avgPartyLevel, statMod, roll1d20,
};
