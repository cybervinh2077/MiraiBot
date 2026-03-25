const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
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

// ─── Audio Filters ────────────────────────────────────────────────────────────
const AUDIO_FILTERS = {
  // Group 1 — Nightcore / Daycore / Vibe
  default:              { label: 'Default',                  emoji: '👌', ffmpeg: null },
  nightcore_gaming:     { label: 'Nightcore Gaming',         emoji: '🎮', ffmpeg: 'asetrate=48000*1.25,aresample=48000,atempo=1.06' },
  nightcore_crush:      { label: 'Nightcore Crush',          emoji: '💜', ffmpeg: 'asetrate=48000*1.22,aresample=48000,atempo=1.04' },
  nightcore_big_sister: { label: 'Nightcore Big Sister',     emoji: '👧', ffmpeg: 'asetrate=48000*1.20,aresample=48000,atempo=1.05' },
  nightcore_little_sister: { label: 'Nightcore Little Sister', emoji: '🧒', ffmpeg: 'asetrate=48000*1.18,aresample=48000,atempo=1.03' },
  daycore_gaming:       { label: 'Daycore Gaming',           emoji: '🌤️', ffmpeg: 'asetrate=48000*0.80,aresample=48000,atempo=0.95' },
  aliens_mexico:        { label: 'Aliens Invading Mexico',   emoji: '👽', ffmpeg: 'asetrate=48000*1.30,aresample=48000,atempo=1.10,vibrato=f=6:d=0.5' },
  south_jakarta:        { label: 'South Jakarta Chipmunk',   emoji: '🐿️', ffmpeg: 'asetrate=48000*1.40,aresample=48000,atempo=0.90' },
  tokyo_karaoke:        { label: 'Tokyo Karaoke Bar',        emoji: '🎤', ffmpeg: 'asetrate=48000*0.95,aresample=48000,equalizer=f=300:width_type=o:width=2:g=3' },
  american_vaporwave:   { label: 'American Vaporwave',       emoji: '🌊', ffmpeg: 'asetrate=48000*0.82,aresample=48000,atempo=0.90' },

  // Group 2 — Effects / Bass / Party
  radio_paris_90s:      { label: 'Radio Paris in 90s',       emoji: '📻', ffmpeg: 'equalizer=f=100:width_type=o:width=2:g=4,equalizer=f=8000:width_type=o:width=2:g=-3,aecho=0.8:0.9:40:0.3' },
  blazing_dubai:        { label: 'Blazing into the Dubai Nights', emoji: '🌃', ffmpeg: 'equalizer=f=60:width_type=o:width=2:g=8,equalizer=f=200:width_type=o:width=2:g=4' },
  '8d_music':           { label: '8D Music Effects',         emoji: '🎧', ffmpeg: 'apulsator=hz=0.125' },
  pop_music:            { label: 'Pop Music Effects',        emoji: '🎵', ffmpeg: 'equalizer=f=100:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=2:g=3,equalizer=f=10000:width_type=o:width=2:g=2' },
  soft_music:           { label: 'Soft Music Effects',       emoji: '🌸', ffmpeg: 'equalizer=f=60:width_type=o:width=2:g=-2,equalizer=f=8000:width_type=o:width=2:g=2,atempo=0.97' },
  tremolo_music:        { label: 'Tremolo Music Effects',    emoji: '〰️', ffmpeg: 'tremolo=f=5:d=0.5' },
  rock_music:           { label: 'Rock Music Effects',       emoji: '🎸', ffmpeg: 'equalizer=f=60:width_type=o:width=2:g=5,equalizer=f=200:width_type=o:width=2:g=3,equalizer=f=4000:width_type=o:width=2:g=4' },
  saturday_night:       { label: 'The Saturday Night Party', emoji: '🎉', ffmpeg: 'equalizer=f=80:width_type=o:width=2:g=6,atempo=1.05' },
  overkilled_bass:      { label: 'The Overkilled Bass',      emoji: '💥', ffmpeg: 'equalizer=f=60:width_type=o:width=2:g=12,equalizer=f=100:width_type=o:width=2:g=8' },
  sky_high:             { label: 'The Sky High',             emoji: '🚀', ffmpeg: 'asetrate=48000*1.10,aresample=48000,equalizer=f=8000:width_type=o:width=2:g=5' },
  problem_child:        { label: 'The Problem Child',        emoji: '😈', ffmpeg: 'asetrate=48000*1.15,aresample=48000,equalizer=f=60:width_type=o:width=2:g=6' },
  deathdealing_deaf:    { label: 'The Deathdealing Deaf',    emoji: '💀', ffmpeg: 'equalizer=f=60:width_type=o:width=2:g=15,equalizer=f=100:width_type=o:width=2:g=10,atempo=1.08' },
  lurking_shadows:      { label: 'Lurking in the Shadows',   emoji: '👻', ffmpeg: 'aecho=0.8:0.9:500:0.3,equalizer=f=60:width_type=o:width=2:g=4' },
  satan_billboard:      { label: 'Satan on the Billboard',   emoji: '😱', ffmpeg: 'asetrate=48000*0.75,aresample=48000,equalizer=f=60:width_type=o:width=2:g=10' },
  zombieland_saga:      { label: 'Zombieland Saga',          emoji: '🧟', ffmpeg: 'asetrate=48000*1.12,aresample=48000,vibrato=f=8:d=0.4,equalizer=f=200:width_type=o:width=2:g=3' },
  karaoke:              { label: 'Karaoke Mode (vocal remove)', emoji: '🎤', ffmpeg: 'pan=stereo|c0=c0-c1|c1=c1-c0', filterComplex: true },
};

// Group 1 keys (first 10 filters)
const FILTER_GROUP_1 = ['default','nightcore_gaming','nightcore_crush','nightcore_big_sister','nightcore_little_sister','daycore_gaming','aliens_mexico','south_jakarta','tokyo_karaoke','american_vaporwave'];
// Group 2 keys (remaining)
const FILTER_GROUP_2 = ['radio_paris_90s','blazing_dubai','8d_music','pop_music','soft_music','tremolo_music','rock_music','saturday_night','overkilled_bass','sky_high','problem_child','deathdealing_deaf','lurking_shadows','satan_billboard','zombieland_saga','karaoke'];

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
    playerMessage: null, filter: 'default',
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
  const { t } = require('./i18n');
  queue.idleTimer = setTimeout(() => {
    queue.textChannel.send(t(queue.guildId, 'music_idle'));
    deleteQueue(queue.guildId);
  }, 60 * 1000);
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Fetch tất cả video IDs trong playlist (có pagination, tối đa 200 bài)
async function getPlaylistItems(playlistId, maxItems = 200) {
  const YT_PLAYLIST_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';
  const videoIds = [];
  let pageToken = null;

  do {
    const params = new URLSearchParams({
      part: 'contentDetails',
      playlistId,
      maxResults: 50,
      key: YT_API_KEY,
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`${YT_PLAYLIST_URL}?${params}`);
    const data = await res.json();
    if (data.error || !data.items?.length) break;

    for (const item of data.items) {
      const vid = item.contentDetails?.videoId;
      if (vid) videoIds.push(vid);
      if (videoIds.length >= maxItems) break;
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken && videoIds.length < maxItems);

  return videoIds;
}

// Fetch metadata cho nhiều videoIds cùng lúc (batch 50)
async function getVideosByIds(videoIds) {
  const results = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      id: batch.join(','),
      key: YT_API_KEY,
    });
    const res = await fetch(`${YT_VIDEO_URL}?${params}`);
    const data = await res.json();
    if (!data.items?.length) continue;
    for (const item of data.items) {
      results.push({
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        duration: parseDuration(item.contentDetails.duration),
        thumbnail: item.snippet.thumbnails?.default?.url,
        requestedBy: null,
      });
    }
  }
  return results;
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

// Full video details for /songinfo
async function getVideoDetails(videoId) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: videoId,
    key: YT_API_KEY,
  });
  const res = await fetch(`${YT_VIDEO_URL}?${params}`);
  const data = await res.json();
  if (!data.items?.length) return null;
  const item = data.items[0];
  const s = item.snippet;
  const stats = item.statistics || {};

  // Truncate description to 300 chars
  const desc = (s.description || '').slice(0, 300).trim();

  return {
    title:        s.title,
    url:          `https://www.youtube.com/watch?v=${videoId}`,
    channel:      s.channelTitle,
    channelUrl:   `https://www.youtube.com/channel/${s.channelId}`,
    publishedAt:  s.publishedAt,
    duration:     parseDuration(item.contentDetails.duration),
    thumbnail:    s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || s.thumbnails?.default?.url,
    description:  desc || null,
    viewCount:    stats.viewCount ? parseInt(stats.viewCount).toLocaleString() : null,
    likeCount:    stats.likeCount ? parseInt(stats.likeCount).toLocaleString() : null,
    tags:         (s.tags || []).slice(0, 5),
    categoryId:   item.contentDetails.caption === 'true' ? 'Has captions' : null,
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

function buildPlayerUI(song, paused = false, filter = 'default') {
  const filterInfo = AUDIO_FILTERS[filter] || AUDIO_FILTERS.default;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: '🎵 Now Playing' })
    .setTitle(song.title)
    .setURL(song.url)
    .addFields(
      { name: 'Queue',  value: 'Use </queue:0>',  inline: true },
      { name: 'Skip',   value: 'Use </skip:0>',   inline: true },
      { name: 'Skip to', value: 'Use </skipto:0>', inline: true },
    )
    .setFooter({ text: `⏱ ${song.duration}${song.requestedBy ? ` • Requested by <@${song.requestedBy}>` : ''}${filter !== 'default' ? ` • Filter: ${filterInfo.label}` : ''}` });

  if (song.thumbnail) embed.setImage(song.thumbnail.replace('default', 'maxresdefault').replace('hqdefault', 'maxresdefault'));

  // Row 1 — playback controls
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_vol_down').setLabel('−').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('🔴').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_pause').setEmoji(paused ? '▶️' : '⏸').setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏩').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_vol_up').setLabel('+').setStyle(ButtonStyle.Secondary),
  );

  // Row 2 — Audio Filters group 1
  const filterSelect1 = new StringSelectMenuBuilder()
    .setCustomId('music_filter_1')
    .setPlaceholder(`🎛 Audio Filters (1) — ${FILTER_GROUP_1.includes(filter) && filter !== 'default' ? filterInfo.label : 'Default'}`)
    .addOptions(FILTER_GROUP_1.map(key => {
      const f = AUDIO_FILTERS[key];
      return { label: f.label, value: key, emoji: f.emoji, default: key === filter };
    }));

  // Row 3 — Audio Filters group 2
  const filterSelect2 = new StringSelectMenuBuilder()
    .setCustomId('music_filter_2')
    .setPlaceholder(`🎛 Audio Filters (2) — ${FILTER_GROUP_2.includes(filter) ? filterInfo.label : 'Select...'}`)
    .addOptions(FILTER_GROUP_2.map(key => {
      const f = AUDIO_FILTERS[key];
      return { label: f.label, value: key, emoji: f.emoji, default: key === filter };
    }));

  const row2 = new ActionRowBuilder().addComponents(filterSelect1);
  const row3 = new ActionRowBuilder().addComponents(filterSelect2);

  return { embeds: [embed], components: [row1, row2, row3] };
}

async function getAudioUrl(songUrl) {
  // Kiểm tra cache trước (chỉ cache YouTube)
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

    // Build ffmpeg args with optional audio filter
    const filterInfo = AUDIO_FILTERS[queue.filter || 'default'];
    let filterArgs = [];
    if (filterInfo?.ffmpeg) {
      if (filterInfo.filterComplex) {
        // Karaoke / pan filter cần -filter_complex với explicit output mapping
        filterArgs = ['-filter_complex', `[0:a]${filterInfo.ffmpeg}[aout]`, '-map', '[aout]'];
      } else {
        filterArgs = ['-af', filterInfo.ffmpeg];
      }
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', audioUrl,
      '-vn',
      ...filterArgs,
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

    queue.playerMessage = await queue.textChannel.send(buildPlayerUI(song, false, queue.filter || 'default'));
  } catch (err) {
    const { t } = require('./i18n');
    console.error('Play error:', err.message);
    await queue.textChannel.send(t(queue.guildId, 'music_play_error', { title: song.title }));
    playNext(queue);
  }
}

function playNext(queue) {
  if (queue.loop && queue.current) return playSong(queue, queue.current);
  if (queue.loopQueue && queue.current) queue.songs.push(queue.current);

  const next = queue.songs.shift();
  if (!next) {
    const { t } = require('./i18n');
    queue.current = null;
    startIdleTimer(queue);
    queue.textChannel.send(t(queue.guildId, 'music_queue_end'));
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

module.exports = { getQueue, createQueue, deleteQueue, playSong, playNext, connect, searchYoutube, searchYoutubeList, getVideoById, getVideoDetails, getVideosByIds, getPlaylistItems, extractPlaylistId, clearIdleTimer, formatDuration, buildPlayerUI, getCachedAudioUrl, AUDIO_FILTERS };
