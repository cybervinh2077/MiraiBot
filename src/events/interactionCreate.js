const { getQueue, playSong, buildPlayerUI, AUDIO_FILTERS } = require('../utils/musicManager');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { t } = require('../utils/i18n');
const { getSession, setSession } = require('../poker/pokerState');
const pokerCmd = require('../commands/poker/poker');

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
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    const { customId, guild, member } = interaction;

    // ── Poker buttons ────────────────────────────────────────────────────────
    if (customId.startsWith('poker_')) {
      const g   = guild.id;
      const uid = interaction.user.id;

      // Only the session owner can act
      if (!customId.endsWith(`_${uid}`)) {
        return interaction.reply({ content: t(g, 'poker_not_your_turn'), ephemeral: true });
      }

      const state = getSession(g, uid);
      if (!state || state.activePlayer !== 'user') {
        return interaction.reply({ content: t(g, 'poker_not_your_turn'), ephemeral: true });
      }

      await interaction.deferUpdate();

      // Disable buttons on the action message
      if (interaction.message) {
        await interaction.message.edit({ components: [] }).catch(() => {});
      }

      const { processAction } = pokerCmd._internal || {};
      // Route action
      if (customId.startsWith('poker_fold_'))  await pokerCmd._processAction(interaction.channel, g, uid, state, 'fold', 0);
      if (customId.startsWith('poker_check_')) await pokerCmd._processAction(interaction.channel, g, uid, state, 'check', 0);
      if (customId.startsWith('poker_call_'))  await pokerCmd._processAction(interaction.channel, g, uid, state, 'call', 0);
      if (customId.startsWith('poker_raise_')) {
        // Raise: fixed amount = 2x big blind for simplicity
        const raiseAmt = state.bigBlind * 2;
        await pokerCmd._processAction(interaction.channel, g, uid, state, 'raise', raiseAmt);
      }
      return;
    }

    if (!customId.startsWith('music_')) return;
    // music_select_<userId> là search result selector, handled by collector in musicHandler
    if (customId.startsWith('music_select_')) return;

    const queue = getQueue(guild.id);
    if (!queue) return interaction.reply({ content: '❌ Không có nhạc đang phát.', ephemeral: true });

    // ── Audio Filter select menus ────────────────────────────────────────────
    if (customId === 'music_filter_1' || customId === 'music_filter_2') {
      await interaction.deferUpdate();
      const selectedFilter = interaction.values[0];
      if (!AUDIO_FILTERS[selectedFilter]) return;

      queue.filter = selectedFilter;

      // Restart current song with new filter applied
      if (queue.current) {
        const current = queue.current;
        queue.songs.unshift(current);
        queue.current = null;
        queue.player.stop();
      }
      return;
    }

    await interaction.deferUpdate();

    switch (customId) {
      case 'music_pause': {
        const isPaused = queue.player.state.status === AudioPlayerStatus.Paused;
        isPaused ? queue.player.unpause() : queue.player.pause();
        if (queue.playerMessage) {
          await queue.playerMessage.edit(buildPlayerUI(queue.current, !isPaused, queue.filter || 'default', queue.loop, queue.loopQueue)).catch(() => {});
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
        if (queue.playerMessage && queue.current) {
          await queue.playerMessage.edit(buildPlayerUI(queue.current, false, queue.filter || 'default', queue.loop, queue.loopQueue)).catch(() => {});
        }
        break;

      case 'music_loop_song':
        queue.loop = !queue.loop;
        queue.loopQueue = false;
        if (queue.playerMessage && queue.current) {
          await queue.playerMessage.edit(buildPlayerUI(queue.current, false, queue.filter || 'default', queue.loop, queue.loopQueue)).catch(() => {});
        }
        break;

      case 'music_loop_queue':
        queue.loopQueue = !queue.loopQueue;
        queue.loop = false;
        if (queue.playerMessage && queue.current) {
          await queue.playerMessage.edit(buildPlayerUI(queue.current, false, queue.filter || 'default', queue.loop, queue.loopQueue)).catch(() => {});
        }
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
