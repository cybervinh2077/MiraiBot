const {
  getQueue,
  createQueue,
  deleteQueue,
  playSong,
  connect,
  searchYoutube,
  searchYoutubeList,
  getVideoById,
  clearIdleTimer,
} = require('../utils/musicManager');
const { getLyrics } = require('../utils/lyrics');
const { AudioPlayerStatus } = require('@discordjs/voice');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

async function handleMusic(msg, command, args) {
  const { guild, member, channel } = msg;
  const voiceChannel = member?.voice?.channel;

  // Lệnh không cần voice channel
  if (command === '?queue' || command === '?q') return cmdQueue(msg);
  if (command === '?nowplaying' || command === '?np') return cmdNowPlaying(msg);

  // Các lệnh còn lại cần ở trong voice channel
  if (!voiceChannel) {
    return msg.reply('❌ Bạn cần vào một kênh voice trước.');
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
  if (!args.length) return msg.reply('❌ Vui lòng nhập tên bài hát hoặc URL.');

  const query = args.join(' ');
  const isUrl = query.includes('youtube.com/watch') || query.includes('youtu.be/');

  // Nếu là URL thì phát thẳng
  if (isUrl) {
    return playDirect(msg, query, voiceChannel);
  }

  // Tìm kiếm và hiển thị danh sách chọn
  const searching = await msg.reply(`🔍 Đang tìm kiếm: **${query}**...`);
  
  const startTime = Date.now();
  const results = await searchYoutubeList(query).catch(() => []);
  const searchTime = Date.now() - startTime;
  
  if (!results.length) return searching.edit('❌ Không tìm thấy kết quả nào.');

  const { EmbedBuilder } = require('discord.js');

  // Emoji số
  const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

  // Embed hiển thị danh sách
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🎵 Kết quả tìm kiếm: ${query}`)
    .setDescription(
      results.map((r, i) =>
        `${numEmoji[i]} **[${r.title}](https://youtu.be/${r.videoId})**\n└ ${r.channel}`
      ).join('\n\n')
    )
    .setFooter({ text: `Tìm thấy trong ${searchTime}ms` });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`music_select_${msg.author.id}`)
    .setPlaceholder('Chọn bài hát...')
    .addOptions(results.map((r, i) => ({
      label: (r.title || `Bài ${i + 1}`).replace(/[^\w\s\-.,!?()]/g, '').slice(0, 100) || `Bài ${i + 1}`,
      description: (r.channel || 'Unknown').slice(0, 100),
      value: `${r.videoId}|${i}`,
      emoji: numEmoji[i],
    })));

  const row = new ActionRowBuilder().addComponents(select);
  await searching.edit({
    content: null,
    embeds: [embed],
    components: [row],
  });

  // Chờ user chọn trong 30 giây
  const collector = searching.createMessageComponentCollector({
    filter: i => i.customId === `music_select_${msg.author.id}` && i.user.id === msg.author.id,
    time: 30_000,
    max: 1,
  });

  collector.on('collect', async (interaction) => {
    const loadStart = Date.now();
    await interaction.deferUpdate();
    const [videoId, idx] = interaction.values[0].split('|');
    
    // Hiển thị loading ngay
    await searching.edit({ content: `⏳ Đang tải **${results[parseInt(idx)].title}**...`, embeds: [], components: [] });
    let song = await getVideoById(videoId).catch((e) => { console.error('getVideoById error:', e.message); return null; });

    // Fallback: dùng thông tin từ search result nếu API không trả về
    if (!song) {
      const searchResult = results[parseInt(idx)];
      if (searchResult) {
        console.warn('getVideoById returned null, using search result for:', videoId);
        song = {
          title: searchResult.title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          duration: '??:??',
          thumbnail: null,
          requestedBy: msg.author.id,
        };
      } else {
        return searching.edit({ content: '❌ Không thể tải thông tin bài hát này.', components: [] });
      }
    }

    song.requestedBy = msg.author.id;
    const loadTime = Date.now() - loadStart;
    console.log(`⏱️ Load time for ${videoId}: ${loadTime}ms`);
    
    await addToQueue(msg, song, voiceChannel, searching);
  });

  collector.on('end', (collected) => {
    if (!collected.size) {
      searching.edit({ content: '⏰ Hết thời gian chọn bài.', embeds: [], components: [] }).catch(() => {});
    }
  });
}

async function playDirect(msg, url, voiceChannel) {
  const searching = await msg.reply('⏳ Đang tải bài hát...');
  const song = await searchYoutube(url).catch(() => null);
  if (!song) return searching.edit('❌ Không thể tải bài hát này.');
  song.requestedBy = msg.author.id;
  await addToQueue(msg, song, voiceChannel, searching);
}

async function addToQueue(msg, song, voiceChannel, replyMsg) {
  let queue = getQueue(msg.guild.id);

  if (!queue) {
    queue = createQueue(msg.guild.id, voiceChannel, msg.channel);
    try {
      await connect(queue);
    } catch {
      deleteQueue(msg.guild.id);
      return replyMsg.edit('❌ Không thể kết nối kênh voice.');
    }
    queue.songs.push(song);
    await replyMsg.edit({ content: `🎵 Đã thêm: **${song.title}** \`[${song.duration}]\``, components: [] });
    playSong(queue, queue.songs.shift());
  } else {
    queue.songs.push(song);
    // Nếu không có bài nào đang phát (queue vừa hết), tự động phát luôn
    if (!queue.current) {
      clearIdleTimer(queue);
      await replyMsg.edit({ content: `🎵 Đã thêm: **${song.title}** \`[${song.duration}]\``, components: [] });
      playSong(queue, queue.songs.shift());
    } else {
      await replyMsg.edit({ content: `✅ Đã thêm vào queue: **${song.title}** \`[${song.duration}]\` — vị trí #${queue.songs.length}`, components: [] });
    }
  }
}

async function cmdSkip(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply('❌ Không có bài nào đang phát.');
  queue.player.stop();
  msg.reply('⏭️ Đã bỏ qua bài hiện tại.');
}

async function cmdStop(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Bot không ở trong kênh voice.');
  queue.songs = [];
  queue.loop = false;
  queue.loopQueue = false;
  queue.player.stop();
  deleteQueue(msg.guild.id);
  msg.reply('⏹️ Đã dừng nhạc và xóa queue.');
}

async function cmdPause(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply('❌ Không có bài nào đang phát.');
  if (queue.player.state.status === AudioPlayerStatus.Paused) {
    return msg.reply('⚠️ Nhạc đang bị tạm dừng rồi. Dùng `?resume` để tiếp tục.');
  }
  queue.player.pause();
  msg.reply('⏸️ Đã tạm dừng.');
}

async function cmdResume(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Không có bài nào đang phát.');
  if (queue.player.state.status !== AudioPlayerStatus.Paused) {
    return msg.reply('⚠️ Nhạc không bị tạm dừng.');
  }
  queue.player.unpause();
  msg.reply('▶️ Tiếp tục phát.');
}

async function cmdVolume(msg, args) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Không có bài nào đang phát.');
  const vol = parseInt(args[0]);
  if (isNaN(vol) || vol < 0 || vol > 200) return msg.reply('❌ Volume từ 0 đến 200.');
  queue.volume = vol / 100;
  if (queue.player.state.resource?.volume) {
    queue.player.state.resource.volume.setVolume(queue.volume);
  }
  msg.reply(`🔊 Volume: **${vol}%**`);
}

async function cmdLoop(msg, args) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Không có bài nào đang phát.');

  const mode = args[0]?.toLowerCase();
  if (mode === 'queue' || mode === 'q') {
    queue.loopQueue = !queue.loopQueue;
    queue.loop = false;
    return msg.reply(`🔁 Loop queue: **${queue.loopQueue ? 'BẬT' : 'TẮT'}**`);
  }
  // Mặc định loop bài hiện tại
  queue.loop = !queue.loop;
  queue.loopQueue = false;
  msg.reply(`🔂 Loop bài hiện tại: **${queue.loop ? 'BẬT' : 'TẮT'}**`);
}

async function cmdShuffle(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply('❌ Queue trống.');
  for (let i = queue.songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
  }
  msg.reply('🔀 Đã shuffle queue.');
}

async function cmdRemove(msg, args) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply('❌ Queue trống.');
  const index = parseInt(args[0]) - 1;
  if (isNaN(index) || index < 0 || index >= queue.songs.length) {
    return msg.reply(`❌ Vị trí không hợp lệ. Queue có **${queue.songs.length}** bài.`);
  }
  const removed = queue.songs.splice(index, 1)[0];
  msg.reply(`🗑️ Đã xóa: **${removed.title}**`);
}

async function cmdClear(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Không có queue.');
  queue.songs = [];
  msg.reply('🗑️ Đã xóa toàn bộ queue.');
}

async function cmdJump(msg, args) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.songs.length) return msg.reply('❌ Queue trống.');
  const index = parseInt(args[0]) - 1;
  if (isNaN(index) || index < 0 || index >= queue.songs.length) {
    return msg.reply(`❌ Vị trí không hợp lệ. Queue có **${queue.songs.length}** bài.`);
  }
  queue.songs = queue.songs.slice(index);
  queue.player.stop();
  msg.reply(`⏩ Nhảy đến bài #${index + 1}: **${queue.songs[0]?.title}**`);
}

async function cmdQueue(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.current && !queue?.songs.length) return msg.reply('❌ Queue trống.');

  const lines = [];
  if (queue.current) {
    lines.push(`▶️ **Đang phát:** ${queue.current.title} \`[${queue.current.duration}]\``);
  }
  if (queue.songs.length) {
    lines.push('');
    lines.push('**Queue:**');
    queue.songs.slice(0, 10).forEach((s, i) => {
      lines.push(`\`${i + 1}.\` ${s.title} \`[${s.duration}]\` — <@${s.requestedBy}>`);
    });
    if (queue.songs.length > 10) lines.push(`... và **${queue.songs.length - 10}** bài nữa`);
  } else {
    lines.push('📭 Không có bài nào trong queue.');
  }

  const flags = [];
  if (queue.loop) flags.push('🔂 Loop bài');
  if (queue.loopQueue) flags.push('🔁 Loop queue');
  if (flags.length) lines.push('\n' + flags.join(' | '));

  msg.reply(lines.join('\n'));
}

async function cmdNowPlaying(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue?.current) return msg.reply('❌ Không có bài nào đang phát.');
  const s = queue.current;
  msg.reply(`🎵 **Đang phát:** ${s.title} \`[${s.duration}]\`${s.requestedBy ? ` — <@${s.requestedBy}>` : ''}`);
}

async function cmdLeave(msg) {
  const queue = getQueue(msg.guild.id);
  if (!queue) return msg.reply('❌ Bot không ở trong kênh voice.');
  deleteQueue(msg.guild.id);
  msg.reply('👋 Đã rời kênh voice.');
}

async function cmdLyrics(msg, args) {
  const queue = getQueue(msg.guild.id);

  const title = args.length ? args.join(' ') : queue?.current?.title;
  if (!title) return msg.reply('❌ Không có bài nào đang phát. Dùng `?lyrics <tên bài>` để tìm.');

  const searching = await msg.reply(`🔍 Đang tìm lời bài: **${title}**...`);
  const result = await getLyrics(title);

  if (!result) {
    return searching.edit(`❌ Không tìm thấy lời bài **${title}**.`);
  }

  const { EmbedBuilder } = require('discord.js');
  const chunks = splitLyrics(result.lyrics, 4000);

  const makeEmbed = (lyricsChunk, page, total) =>
    new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📜 ${result.artist} — ${result.song}`)
      .setDescription('```\n' + lyricsChunk + '\n```')
      .setFooter({ text: total > 1 ? `Trang ${page}/${total}` : 'MiraiBot Lyrics' });

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
