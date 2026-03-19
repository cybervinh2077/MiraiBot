const { getQueue, playSong, buildPlayerUI } = require('../utils/musicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const msg = { content: 'Có lỗi xảy ra khi thực thi lệnh này.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
        else await interaction.reply(msg);
      }
      return;
    }

    // Music buttons
    if (!interaction.isButton()) return;
    const { customId, guild, member } = interaction;
    if (!customId.startsWith('music_')) return;

    const queue = getQueue(guild.id);
    if (!queue) return interaction.reply({ content: '❌ Không có nhạc đang phát.', ephemeral: true });

    await interaction.deferUpdate();

    switch (customId) {
      case 'music_pause': {
        const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
        isPaused ? queue.player.unpause() : queue.player.pause();
        if (queue.playerMessage) {
          await queue.playerMessage.edit(buildPlayerUI(queue.current, !isPaused)).catch(() => {});
        }
        break;
      }
      case 'music_skip':
        queue.player.stop();
        break;

      case 'music_stop':
        queue.songs = [];
        queue.loop = false;
        queue.loopQueue = false;
        queue.player.stop();
        if (queue.playerMessage) {
          await queue.playerMessage.edit({ content: '⏹️ Đã dừng nhạc.', embeds: [], components: [] }).catch(() => {});
          queue.playerMessage = null;
        }
        break;

      case 'music_prev':
        // Phát lại bài hiện tại từ đầu
        if (queue.current) {
          queue.player.stop();
          queue.songs.unshift(queue.current);
          queue.songs.unshift(queue.current);
        }
        break;

      case 'music_vol_down': {
        queue.volume = Math.max(0, queue.volume - 0.1);
        if (queue.player.state.resource?.volume) {
          queue.player.state.resource.volume.setVolume(queue.volume);
        }
        break;
      }
      case 'music_vol_up': {
        queue.volume = Math.min(2, queue.volume + 0.1);
        if (queue.player.state.resource?.volume) {
          queue.player.state.resource.volume.setVolume(queue.volume);
        }
        break;
      }
      case 'music_loop':
        queue.loop = !queue.loop;
        queue.loopQueue = false;
        break;

      case 'music_shuffle': {
        for (let i = queue.songs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
        }
        break;
      }
      case 'music_queue': {
        const lines = [];
        if (queue.current) lines.push(`▶️ **${queue.current.title}** \`[${queue.current.duration}]\``);
        if (queue.songs.length) {
          queue.songs.slice(0, 10).forEach((s, i) => lines.push(`\`${i + 1}.\` ${s.title} \`[${s.duration}]\``));
          if (queue.songs.length > 10) lines.push(`... và **${queue.songs.length - 10}** bài nữa`);
        } else {
          lines.push('📭 Queue trống.');
        }
        await interaction.followUp({ content: lines.join('\n'), ephemeral: true });
        break;
      }
    }
  },
};
