const { getQueue, deleteQueue } = require('../utils/musicManager');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const guildId = oldState.guild.id;
    const queue = getQueue(guildId);
    if (!queue) return;

    // Chỉ quan tâm khi có người rời kênh voice mà bot đang ở
    const botVoiceChannel = queue.voiceChannel;
    if (!botVoiceChannel) return;

    // Lấy danh sách members trong kênh (không tính bot)
    const members = botVoiceChannel.members.filter(m => !m.user.bot);

    if (members.size === 0) {
      await queue.textChannel.send('👋 Không còn ai trong kênh voice. Bot đã rời và xóa queue.');
      deleteQueue(guildId);
    }
  },
};
