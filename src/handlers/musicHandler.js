const {
  getQueue,
  createQueue,
  deleteQueue,
  playSong,
  connect,
  searchYoutube,
  searchYoutubeList,
  getVideoById,
  getVideosByIds,
  getPlaylistItems,
  extractPlaylistId,
  clearIdleTimer,
} = require('../utils/musicManager');
const { getLyrics } = require('../utils/lyrics');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../utils/i18n');

function gid(msg) { return msg.guild?.id; }

async function handleMusic(msg, command, args) {
  const { member } = msg;
  const voiceChannel = member?.voice?.channel;

  // Lệnh không cần voice channel
  if (command === '?queue' || command === '?q') return cmdQueue(msg);
  if (command === '?nowplaying' || command === '?np') return cmdNowPlaying(msg);

  // Các lệnh còn lại cần ở trong voice channel
  if (!voiceChannel) {
    return msg.reply(t(gid(msg), 'music_no_voice'));
  }

  switch (command) {
    case '?play':
    case '?p':
      return cmdPlay(msg, args, voiceChannel);
    case '?skip':
    case '?s':
      return cmdSkip(msg);
    case '?stop':
      return cmdStop(msg);
    case '?pause':
      return cmdPause(msg);
    case '?resume':
      return cmdResume(msg);
    case '?volume':
    case '?vol':
      return cmdVolume(msg, args);
    case '?loop':
      return cmdLoop(msg, args);
    case '?shuffle':
      return cmdShuffle(msg);
    case '?remove':
      return cmdRemove(msg, args);
    case '?clear':
      return cmdClear(msg);
    case '?jump':
      return cmdJump(msg, args);
    case '?leave':
    case '?dc':
      return cmdLeave(msg);
    case '?lyrics':
    case '?ly':
      return cmdLyrics(msg, args);
  }
}

async function cmdPlay(msg, args, voiceChannel) {
  const g = gid(msg);
  if (!args.length) return msg.reply(t(g, 'music_no_song'));

  const query = args.join(' ');
  const isUrl = query.includes('youtube.com/watch') || query.includes('youtu.be/') || query.includes('youtube.com/playlist');

  if (isUrl) {
    // Kiểm tra có phải playlist không
    const playlistId = extractPlaylistId(query);
    if (playlistId) return playPlaylist(msg, query, playlistId, voiceChannel);
    return playDirect(msg, query, voiceChannel);
  }

  const searching = await msg.reply(t(g, 'music_searching', { query }));
  const startTime = Date.now();
  const results = await searchYoutubeList(query).catch(() => []);
  const searchTime = Date.now() - startTime;

  if (!results.length) return searching.edit(t(g, 'music_no_results'));

  const { EmbedBuilder } = require('discord.js');
  const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(t(g, 'music_search_title', { query }))
    .setDescription(results.map((r, i) =>
      `${numEmoji[i]} **[${r.title}](https://youtu.be/${r.videoId})**\n└ ${r.channel}`
    ).join('\n\n'))
    .setFooter({ text: t(g, 'music_search_footer', { ms: searchTime }) });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`music_select_${msg.author.id}`)
    .setPlaceholder(t(g, 'music_select_placeholder'))
    .addOptions(results.map((r, i) => ({
      label: (r.title || `#${i + 1}`).replace(/[^\w\s\-.,!?()]/g, '').slice(0, 100) || `#${i + 1}`,
      description: (r.channel || 'Unknown').slice(0, 100),
      value: `${r.videoId}|${i}`,
      emoji: numEmoji[i],
    })));

  const row = new ActionRowBuilder().addComponents(select);
  await searching.edit({ content: null, embeds: [embed], components: [row] });

  const collector = searching.createMessageComponentCollector({
    filter: i => i.customId === `music_select_${msg.author.id}` && i.user.id === msg.author.id,
    time: 30_000, max: 1,
  });

  collector.on('collect', async (interaction) => {
    await interaction.deferUpdate();
    const [videoId, idx] = interaction.values[0].split('|');
    await searching.edit({ content: t(g, 'music_loading', { title: results[parseInt(idx)].title }), embeds: [], components: [] });

    let song = await getVideoById(videoId).catch((e) => { console.error('getVideoById error:', e.message); return null; });
    if (!song) {
      const sr = results[parseInt(idx)];
      if (sr) {
        song = { title: sr.title, url: `https://www.youtube.com/watch?v=${videoId}`, duration: '??:??', thumbnail: null, requestedBy: msg.author.id };
      } else {
        return searching.edit({ content: t(g, 'music_load_fail'), components: [] });
      }
    }
    song.requestedBy = msg.author.id;
    await addToQueue(msg, song, voiceChannel, searching);
  });

  collector.on('end', (collected) => {
    if (!collected.size) searching.edit({ content: t(g, 'music_timeout'), embeds: [], components: [] }).catch(() => {});
  });
}

async function playDirect(msg, url, voiceChannel) {
  const g = gid(msg);
  const searching = await msg.reply(t(g, 'music_loading', { title: url }));
  const song = await searchYoutube(url).catch(() => null);
  if (!song) return searching.edit(t(g, 'music_load_fail'));
  song.requestedBy = msg.author.id;
  await addToQueue(msg, song, voiceChannel, searching);
}

async function playPlaylist(msg, url, playlistId, voiceChannel) {
  const g = gid(msg);
  const statusMsg = await msg.reply(`⏳ Đang tải playlist...`);

  let videoIds;
  try {
    videoIds = await getPlaylistItems(playlistId);
  } catch (err) {
    console.error('Playlist fetch error:', err);
    return statusMsg.edit('❌ Không thể tải playlist. Kiểm tra lại link hoặc playlist có thể là private.');
  }

  if (!videoIds.length) return statusMsg.edit('❌ Playlist trống hoặc không tìm thấy.');

  // Lấy metadata bài đầu tiên ngay
  const firstSong = await getVideoById(videoIds[0]).catch(() => null);
  if (!firstSong) return statusMsg.edit('❌ Không thể tải bài đầu tiên trong playlist.');
  firstSong.requestedBy = msg.author.id;

  await statusMsg.edit(`✅ Tìm thấy **${videoIds.length}** bài trong playlist. Đang thêm vào queue...`);

  // Add bài đầu vào queue và bắt đầu phát
  await addToQueue(msg, firstSong, voiceChannel, statusMsg);

  // Fetch metadata các bài còn lại trong background (batch)
  if (videoIds.length > 1) {
    const remainingIds = videoIds.slice(1);
    setImmediate(async () => {
      try {
        const songs = await getVideosByIds(remainingIds);
        const queue = getQueue(msg.guild.id);
        if (!queue) return; // Queue đã bị xóa

        for (const song of songs) {
          song.requestedBy = msg.author.id;
          queue.songs.push(song);
        }

        // Thông báo sau khi load xong
        msg.channel.send(`📋 Đã thêm **${songs.length}** bài từ playlist vào queue.`).catch(() => {});
      } catch (err) {
        console.error('Playlist background load error:', err);
        msg.channel.send('⚠️ Một số bài trong playlist không thể tải.').catch(() => {});
      }
    });
  }
}

async function addToQueue(msg, song, voiceChannel, replyMsg) {
  const g = gid(msg);
  let queue = getQueue(msg.guild.id);

  if (!queue) {
    queue = createQueue(msg.guild.id, voiceChannel, msg.channel);
    try {
      await connect(queue);
    } catch {
      deleteQueue(msg.guild.id);
      return replyMsg.edit(t(g, 'music_no_voice_connect'));
    }
    queue.songs.push(song);
    await replyMsg.edit({ content: t(g, 'music_added', { title: song.title, duration: song.duration }), components: [] });
    playSong(queue, queue.songs.shift());
  } else {
    queue.songs.push(song);
    if (!queue.current) {
      clearIdleTimer(queue);
      await replyMsg.edit({ content: t(g, 'music_added', { title: song.title, duration: song.duration }), components: [] });
      playSong(queue, queue.songs.shift());
    } else {
      await replyMsg.edit({ content: t(g, 'music_queued', { title: song.title, duration: song.duration, pos: queue.songs.length }), components: [] });
    }
  }
}

async function cmdSkip(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply(t(g, 'music_no_playing'));
  queue.player.stop();
  msg.reply(t(g, 'music_skipped'));
}

async function cmdStop(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_not_in_voice'));
  queue.songs = [];
  queue.loop = false;
  queue.loopQueue = false;
  queue.player.stop();
  deleteQueue(msg.guild.id);
  msg.reply(t(g, 'music_stopped'));
}

async function cmdPause(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply(t(g, 'music_no_playing'));
  if (queue.player.state.status === AudioPlayerStatus.Paused) {
    return msg.reply(t(g, 'music_already_paused', { prefix: '?' }));
  }
  queue.player.pause();
  msg.reply(t(g, 'music_paused'));
}

async function cmdResume(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_no_playing'));
  if (queue.player.state.status !== AudioPlayerStatus.Paused) {
    return msg.reply(t(g, 'music_not_paused'));
  }
  queue.player.unpause();
  msg.reply(t(g, 'music_resumed'));
}

async function cmdVolume(msg, args) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_no_playing'));
  const vol = parseInt(args[0]);
  if (isNaN(vol) || vol < 0 || vol > 200) return msg.reply(t(g, 'music_volume_invalid'));
  queue.volume = vol / 100;
  if (queue.player.state.resource?.volume) queue.player.state.resource.volume.setVolume(queue.volume);
  msg.reply(t(g, 'music_volume_set', { vol }));
}

async function cmdLoop(msg, args) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_no_playing'));
  const mode = args[0]?.toLowerCase();
  if (mode === 'queue' || mode === 'q') {
    queue.loopQueue = !queue.loopQueue;
    queue.loop = false;
    return msg.reply(t(g, 'music_loop_queue', { state: t(g, queue.loopQueue ? 'music_loop_on' : 'music_loop_off') }));
  }
  queue.loop = !queue.loop;
  queue.loopQueue = false;
  msg.reply(t(g, 'music_loop_song', { state: t(g, queue.loop ? 'music_loop_on' : 'music_loop_off') }));
}

async function cmdShuffle(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply(t(g, 'music_queue_empty'));
  for (let i = queue.songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
  }
  msg.reply(t(g, 'music_shuffle_done'));
}

async function cmdRemove(msg, args) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply(t(g, 'music_queue_empty'));
  const index = parseInt(args[0]) - 1;
  if (isNaN(index) || index < 0 || index >= queue.songs.length) {
    return msg.reply(t(g, 'music_remove_invalid', { count: queue.songs.length }));
  }
  const removed = queue.songs.splice(index, 1)[0];
  msg.reply(t(g, 'music_removed', { title: removed.title }));
}

async function cmdClear(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_queue_empty'));
  queue.songs = [];
  msg.reply(t(g, 'music_cleared'));
}

async function cmdJump(msg, args) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply(t(g, 'music_queue_empty'));
  const index = parseInt(args[0]) - 1;
  if (isNaN(index) || index < 0 || index >= queue.songs.length) {
    return msg.reply(t(g, 'music_jump_invalid', { count: queue.songs.length }));
  }
  queue.songs = queue.songs.slice(index);
  queue.player.stop();
  msg.reply(t(g, 'music_jumped', { pos: index + 1, title: queue.songs[0]?.title }));
}

async function cmdQueue(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.current && !queue?.songs.length) return msg.reply(t(g, 'music_queue_empty'));

  const lines = [];
  if (queue.current) lines.push(t(g, 'music_queue_header', { title: queue.current.title, duration: queue.current.duration }));
  if (queue.songs.length) {
    lines.push('');
    lines.push(t(g, 'music_queue_list'));
    queue.songs.slice(0, 10).forEach((s, i) => {
      lines.push(`\`${i + 1}.\` ${s.title} \`[${s.duration}]\` — <@${s.requestedBy}>`);
    });
    if (queue.songs.length > 10) lines.push(t(g, 'music_queue_more', { count: queue.songs.length - 10 }));
  } else {
    lines.push(t(g, 'music_queue_none'));
  }
  const flags = [];
  if (queue.loop) flags.push(t(g, 'music_loop_song', { state: t(g, 'music_loop_on') }));
  if (queue.loopQueue) flags.push(t(g, 'music_loop_queue', { state: t(g, 'music_loop_on') }));
  if (flags.length) lines.push('\n' + flags.join(' | '));
  msg.reply(lines.join('\n'));
}

async function cmdNowPlaying(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply(t(g, 'music_no_playing'));
  const s = queue.current;
  msg.reply(t(g, 'music_now_playing', { title: s.title, duration: s.duration }) + (s.requestedBy ? ` — <@${s.requestedBy}>` : ''));
}

async function cmdLeave(msg) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply(t(g, 'music_not_in_voice'));
  deleteQueue(msg.guild.id);
  msg.reply(t(g, 'music_left'));
}

async function cmdLyrics(msg, args) {
  const g = gid(msg);
  const queue = getQueue(msg.guild.id);
  const title = args.length ? args.join(' ') : queue?.current?.title;
  if (!title) return msg.reply(t(g, 'lyrics_no_playing', { prefix: '?' }));

  const searching = await msg.reply(t(g, 'lyrics_searching', { title }));
  const result = await getLyrics(title);
  if (!result) return searching.edit(t(g, 'lyrics_not_found', { title }));

  const { EmbedBuilder } = require('discord.js');
  const chunks = splitLyrics(result.lyrics, 4000);
  const makeEmbed = (chunk, page, total) =>
    new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📜 ${result.artist} — ${result.song}`)
      .setDescription('```\n' + chunk + '\n```')
      .setFooter({ text: total > 1 ? t(g, 'lyrics_footer', { page, total }) : t(g, 'lyrics_footer_single') });

  const totalPages = chunks.length;
  await searching.edit({ content: null, embeds: [makeEmbed(chunks[0], 1, totalPages)] });
  for (let i = 1; i < chunks.length; i++) {
    await msg.channel.send({ embeds: [makeEmbed(chunks[i], i + 1, totalPages)] });
  }
}

function splitLyrics(lyrics, maxLen = 4000) {
  const chunks = [];
  let current = '';
  for (const line of lyrics.split('\n')) {
    if ((current + line + '\n').length > maxLen) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  return chunks;
}

async function handleMusicSlash(interaction, command) {
  const voiceChannel = interaction.member?.voice?.channel;
  const msg = {
    guild: interaction.guild,
    member: interaction.member,
    channel: interaction.channel,
    author: interaction.user,
    reply: (content) => {
      if (typeof content === 'string') content = { content };
      if (interaction.replied || interaction.deferred) return interaction.followUp(content);
      return interaction.reply(content);
    },
  };

  // Defer cho các lệnh cần thời gian
  if (['play', 'lyrics'].includes(command)) {
    await interaction.deferReply();
    msg.reply = (content) => {
      if (typeof content === 'string') content = { content };
      return interaction.editReply(content);
    };
  }

  switch (command) {
    case 'play': {
      const query = interaction.options.getString('query');
      return cmdPlay(msg, [query], voiceChannel);
    }
    case 'skip': return cmdSkip(msg);
    case 'stop': return cmdStop(msg);
    case 'pause': return cmdPause(msg);
    case 'resume': return cmdResume(msg);
    case 'queue': return cmdQueue(msg);
    case 'nowplaying': return cmdNowPlaying(msg);
    case 'volume': {
      const level = interaction.options.getInteger('level');
      return cmdVolume(msg, [level]);
    }
    case 'loop': {
      const mode = interaction.options.getString('mode') || '';
      return cmdLoop(msg, [mode]);
    }
    case 'shuffle': return cmdShuffle(msg);
    case 'lyrics': {
      const title = interaction.options.getString('title') || '';
      return cmdLyrics(msg, title ? [title] : []);
    }
    case 'leave': return cmdLeave(msg);
  }
}

module.exports = { handleMusic, handleMusicSlash };
