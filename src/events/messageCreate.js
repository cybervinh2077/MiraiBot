const { addXp } = require('../utils/leveling');
const { onMessageForSpawn } = require('../pokemon/pokemonEngine');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'messageCreate',
  async execute(msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return;

    // Level system
    addXp(msg).then(({ leveledUp, userData }) => {
      if (leveledUp) {
        msg.channel.send(t(msg.guild.id, 'level_up', { user: msg.author.toString(), level: userData.level })).catch(() => {});
      }
    }).catch(err => console.error('Level system error:', err));

    // Pokémon spawn
    onMessageForSpawn(msg).catch(err => console.error('Pokemon spawn error:', err));
  },
};
