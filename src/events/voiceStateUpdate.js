const { getQueue, deleteQueue } = require('../utils/musicManager');
const { t } = require('../utils/i18n');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guildId = oldState.guild.id;
    const queue = getQueue(guildId);
    if (!queue) return;

    const botVoiceChannel = queue.voiceChannel;
    if (!botVoiceChannel) return;

    const members = botVoiceChannel.members.filter(m => !m.user.bot);

    if (members.size === 0) {
      await queue.textChannel.send(t(guildId, 'voice_empty_leave'));
      deleteQueue(guildId);
    }
  },
};
