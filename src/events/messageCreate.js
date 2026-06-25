const { addXp } = require('../utils/leveling');
const { getLevelChannel } = require('../utils/guildAuth');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'messageCreate',
  async execute(msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return;

    // Level system
    addXp(msg).then(({ leveledUp, userData }) => {
      if (!leveledUp) return;

      // Gửi thông báo lên channel đã được /setup chỉ định (nếu có),
      // nếu chưa cấu hình thì gửi ngay tại channel của tin nhắn.
      let target = msg.channel;
      const channelId = getLevelChannel(msg.guild.id);
      if (channelId) {
        const ch = msg.guild.channels.cache.get(channelId);
        if (ch?.isTextBased?.()) target = ch;
      }

      target.send(t(msg.guild.id, 'level_up', { user: msg.author.toString(), level: userData.level })).catch(() => {});
    }).catch(err => console.error('Level system error:', err));
  },
};
