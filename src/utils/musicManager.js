const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { exec } = require('yt-dlp-exec');
const { spawn } = require('child_process');

// Ưu tiên system ffmpeg (cần thiết trên ARM như Orange Pi)
// Fallback sang ffmpeg-static nếu không có system ffmpeg
let ffmpegPath;
try {
  const { execSync } = require('child_process');
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegPath = 'ffmpeg';
  console.log('Using system ffmpeg');
} catch {
  ffmpegPath = require('ffmpeg-static');
  console.log('Using ffmpeg-static:', ffmpegPath);
}

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YT_VIDEO_URL = 'https://www.googleapis.com/youtube/v3/videos';

const queues = new Map();
const audioUrlCache = new Map(); // Cache audio URL để tránh gọi yt-dlp lại

function getCachedAudioUrl(videoId) {
  const cached = audioUrlCache.get(videoId);
  if (!cached) return null;
  // URL YouTube expire sau ~6 giờ, cache 5 giờ cho an toàn
  if (Date.now() - cached.timestamp > 5 * 60 * 60 * 1000) {
    audioUrlCache.delete(videoId);
    return null;
  }
  return cached.url;
}

function setCachedAudioUrl(videoId, url) {
  audioUrlCache.set(videoId, { url, timestamp: Date.now() });
  // Giới hạn cache 50 entries
  if (audioUrlCache.size > 50) {
    const firstKey = audioUrlCache.keys().next().value;
    audioUrlCache.delete(firstKey);
  }
}

function getQueue(guildId) {
  return queues.get(guildId);
}

function createQueue(guildId, voiceChannel, textChannel) {
  const player = createAudioPlayer();
  const queue = {
    guildId, voiceChannel, textChannel,
    connection: null, player,
    songs: [], current: null,
    volume: 1, loop: false, loopQueue: false, idleTimer: null,
    playerMessage: null,
  };
  queues.set(guildId, queue);
  return queue;
}

function deleteQueue(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;
  clearIdleTimer(queue);
  if (queue.connection) queue.connection.destroy();
  queues.delete(guildId);
}

function clearIdleTimer(queue) {
  if (queue.idleTimer) { clearTimeout(queue.idleTimer); queue.idleTimer = null; }
}

function startIdleTimer(queue) {
  clearIdleTimer(queue);
  queue.idleTimer = setTimeout(() => {
    queue.textChannel.send('⏹️ Không có bài nào được thêm trong 1 phút. Bot đã rời kênh voice.');
    deleteQueue(queue.guildId);
  }, 60 * 1000);
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function getVideoById(videoId) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: YT_API_KEY,
  });
  const res = await fetch(`${YT_VIDEO_URL}?${params}`);
  const data = await res.json();
  if (data.error) {
    console.error('YouTube API error:', data.error.code, data.error.message);
    return null;
  }
  if (!data.items?.length) {
    console.warn('getVideoById: no items for videoId:', videoId);
    return null;
  }
  const item = data.items[0];
  return {
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    duration: parseDuration(item.contentDetails.duration),
    thumbnail: item.snippet.thumbnails?.default?.url,
    requestedBy: null,
  };
}

async function searchYoutube(query) {
  if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
    const videoId = extractVideoId(query);
    return getVideoById(videoId);
  }

  const params = new URLSearchParams({
    part: 'snippet', q: query, type: 'video', maxResults: 10, key: YT_API_KEY,
  });
  const res = await fetch(`${YT_SEARCH_URL}?${params}`);
  const data = await res.json();
  if (!data.items?.length) return null;
  return getVideoById(data.items[0].id.videoId);
}

async function searchYoutubeList(query) {
  const params = new URLSearchParams({
    part: 'snippet', q: query, type: 'video', maxResults: 10, key: YT_API_KEY,
  });
  const res = await fetch(`${YT_SEARCH_URL}?${params}`);
  const data = await res.json();
  if (!data.items?.length) return [];
  return data.items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
  }));
}

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '??:??';
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function buildPlayerUI(song, paused = false) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎵 Đang phát')
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields({ name: '⏱ Thời lượng', value: `\`${song.duration}\``, inline: true })
    .setFooter({ text: song.requestedBy ? `Yêu cầu bởi <@${song.requestedBy}>` : 'MiraiBot' });

  if (song.thumbnail) embed.setThumbnail(song.thumbnail);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji(paused ? '▶️' : '⏸').setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_queue').setEmoji('📋').setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_vol_down').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_vol_up').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_loop').setEmoji('🔂').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [row, row2] };
}

async function getAudioUrl(songUrl) {
  // Kiểm tra cache trước
  const videoId = extractVideoId(songUrl);
  if (videoId) {
    const cached = getCachedAudioUrl(videoId);
    if (cached) {
      console.log(`⚡ Audio URL from cache for ${videoId}`);
      return cached;
    }
  }

  const startTime = Date.now();
  let result;
  try {
    result = await exec(songUrl, {
      dumpSingleJson: true,
      noPlaylist: true,
      format: 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true, // Chỉ lấy metadata, không download
      socketTimeout: 10, // Timeout 10s thay vì mặc định 30s
    });
  } catch (e) {
    // execa throw khi exitCode != 0, nhưng stdout vẫn có thể có data
    result = e;
  }

  // result có thể là execa object với stdout chứa JSON
  let info = result;
  if (result && typeof result === 'object' && 'stdout' in result) {
    try {
      info = JSON.parse(result.stdout);
    } catch {
      // stdout không phải JSON, log stderr để debug
      console.error('yt-dlp stderr:', (result.stderr || '').slice(0, 300));
      throw new Error('yt-dlp failed: ' + (result.stderr || result.all || '').slice(0, 200));
    }
  }

  if (info && typeof info === 'object') {
    if (info.url) {
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ yt-dlp extracted URL in ${elapsed}ms`);
      if (videoId) setCachedAudioUrl(videoId, info.url);
      return info.url;
    }

    if (info.formats?.length) {
      const audioFmts = info.formats
        .filter(f => f.url && f.vcodec === 'none' && f.acodec !== 'none')
        .sort((a, b) => (b.abr || 0) - (a.abr || 0));

      if (audioFmts.length) {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ yt-dlp extracted URL from formats in ${elapsed}ms (abr: ${audioFmts[0].abr})`);
        if (videoId) setCachedAudioUrl(videoId, audioFmts[0].url);
        return audioFmts[0].url;
      }

      const anyFmt = info.formats.slice().reverse().find(f => f.url);
      if (anyFmt) {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️ yt-dlp extracted URL (fallback) in ${elapsed}ms`);
        if (videoId) setCachedAudioUrl(videoId, anyFmt.url);
        return anyFmt.url;
      }
    }

    if (info.manifest_url) return info.manifest_url;
  }

  throw new Error('Cannot extract audio URL from yt-dlp output');
}

async function playSong(queue, song) {
  if (!song) { startIdleTimer(queue); return; }

  queue.current = song;
  clearIdleTimer(queue);

  // Prefetch audio URL của bài tiếp theo trong background
  if (queue.songs.length > 0) {
    const nextSong = queue.songs[0];
    const nextVideoId = extractVideoId(nextSong.url);
    if (nextVideoId && !getCachedAudioUrl(nextVideoId)) {
      setTimeout(() => {
        getAudioUrl(nextSong.url).catch(() => {}); // Prefetch, ignore errors
      }, 2000); // Delay 2s để không tranh bandwidth với bài hiện tại
    }
  }

  try {
    const audioUrl = await getAudioUrl(song.url);
    console.log('Audio URL:', audioUrl?.slice(0, 80));

    const ffmpeg = spawn(ffmpegPath, [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', audioUrl,
      '-vn',
      '-acodec', 'libopus',
      '-f', 'opus',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    ffmpeg.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Error') || msg.includes('error')) {
        console.error('ffmpeg stderr:', msg.slice(0, 200));
      }
    });

    ffmpeg.on('error', (err) => {
      console.error('ffmpeg spawn error:', err.message);
    });

    const resource = createAudioResource(ffmpeg.stdout, { inlineVolume: true });
    resource.volume?.setVolume(queue.volume);
    queue.player.play(resource);

    if (queue.playerMessage) {
      await queue.playerMessage.delete().catch(() => {});
      queue.playerMessage = null;
    }

    queue.playerMessage = await queue.textChannel.send(buildPlayerUI(song));
  } catch (err) {
    console.error('Play error:', err.message);
    await queue.textChannel.send(`❌ Không thể phát **${song.title}** (có thể do bản quyền hoặc bị chặn), bỏ qua...`);
    playNext(queue);
  }
}

function playNext(queue) {
  if (queue.loop && queue.current) return playSong(queue, queue.current);
  if (queue.loopQueue && queue.current) queue.songs.push(queue.current);

  const next = queue.songs.shift();
  if (!next) {
    queue.current = null;
    startIdleTimer(queue);
    queue.textChannel.send('✅ Queue đã hết bài. Bot sẽ tự rời sau 1 phút nếu không có bài mới.');
    return;
  }
  playSong(queue, next);
}

async function connect(queue) {
  const connection = joinVoiceChannel({
    channelId: queue.voiceChannel.id,
    guildId: queue.guildId,
    adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
  });

  queue.connection = connection;
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
  } catch (err) {
    console.error('Voice connection failed:', err);
    connection.destroy();
    throw err;
  }
  connection.subscribe(queue.player);

  queue.player.on(AudioPlayerStatus.Idle, () => playNext(queue));
  queue.player.on('error', (err) => { console.error('Player error:', err); playNext(queue); });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch { deleteQueue(queue.guildId); }
  });
}

module.exports = { getQueue, createQueue, deleteQueue, playSong, playNext, connect, searchYoutube, searchYoutubeList, getVideoById, clearIdleTimer, formatDuration, buildPlayerUI, getCachedAudioUrl };
