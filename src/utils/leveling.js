const { getUserData, setUserData } = require('./levelStorage');

const LEVEL_CONFIG = {
  minXp:    15,
  maxXp:    25,
  cooldown: 60_000, // 60s — same as Mee6
};

function getRandomXp(min = LEVEL_CONFIG.minXp, max = LEVEL_CONFIG.maxXp) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Mee6 formula: XP required to reach next level from current level
function getRequiredXp(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

async function addXp(message) {
  if (message.author.bot)              return { leveledUp: false };
  if (!message.guild)                  return { leveledUp: false };
  if (message.content.trim().length < 3) return { leveledUp: false };

  const guildId = message.guild.id;
  const userId  = message.author.id;

  const { data: user, all } = getUserData(guildId, userId);

  // Anti-spam cooldown
  if (Date.now() - user.lastMessage < LEVEL_CONFIG.cooldown) {
    return { leveledUp: false, userData: user };
  }

  const prevLevel = user.level;

  user.xp          += getRandomXp();
  user.lastMessage  = Date.now();

  // Level up loop
  while (user.xp >= getRequiredXp(user.level)) {
    user.level++;
  }

  // Persist
  all[guildId][userId] = user;
  const { saveLevels } = require('./levelStorage');
  saveLevels(all);

  return { leveledUp: user.level > prevLevel, userData: user };
}

module.exports = { addXp, getRequiredXp, getRandomXp, LEVEL_CONFIG };
