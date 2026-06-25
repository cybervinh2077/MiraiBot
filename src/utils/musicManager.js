const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
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

// ─── Autoplay ───────────────────────────────────────────────────────────────
// Các "flavor" thêm vào query để đa dạng kết quả mỗi lần nạp thêm bài
const AUTOPLAY_FLAVORS = ['', 'mix', 'best songs', 'playlist', 'top hits', 'greatest hits', 'official audio', 'remix', 'new songs', 'live'];

/**
 * Nạp thêm bài cho chế độ autoplay: search YouTube theo queue.autoplay.query,
 * loại bỏ các video đã phát (seen), rồi push vào queue.songs.
 * Trả về số bài đã thêm.
 */
async function refillAutoplay(queue, target = 5) {
  const ap = queue.autoplay;
  if (!ap) return 0;
  if (queue._autoplayLoading) return 0;
  queue._autoplayLoading = true;
  try {
    let added = 0;
    const flavors = [...AUTOPLAY_FLAVORS].sort(() => Math.random() - 0.5);
    for (const flavor of flavors) {
      if (added >= target) break;
      const q = flavor ? `${ap.query} ${flavor}` : ap.query;
      const results = await searchYoutubeList(q).catch(() => []);
      const fresh = results.filter(r => r.videoId && !ap.seen.has(r.videoId));
      if (!fresh.length) continue;

      const ids = [];
      for (const r of fresh) {
        if (added + ids.length >= target) break;
        ap.seen.add(r.videoId); // đánh dấu ngay để không trùng giữa các flavor
        ids.push(r.videoId);
      }
      if (!ids.length) continue;

      const songs = await getVideosByIds(ids).catch(() => []);
      for (const s of songs) {
        s.requestedBy = ap.requestedBy;
        s.source = 'youtube';
        queue.songs.push(s);
        added++;
      }
    }
    // Giới hạn kích thước seen để tránh phình bộ nhớ khi chạy lâu
    if (ap.seen.size > 500) {
      const arr = [...ap.seen];
      ap.seen = new Set(arr.slice(arr.length - 250));
    }
    return added;
  } finally {
    queue._autoplayLoading = false;
  }
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

const SOURCE_LABELS = {
  spotify:    { label: 'Spotify',      emoji: '🟢' },
  apple:      { label: 'Apple Music',  emoji: '🍎' },
  soundcloud: { label: 'SoundCloud',   emoji: '🟠' },
  youtube:    { label: 'YouTube',      emoji: '🔴' },
};

// Thanh tiến trình tượng trưng cho volume (0..200% → 0..10 ô)
function volumeBar(volume) {
  const filled = Math.max(0, Math.min(10, Math.round((volume / 2) * 10)));
  return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
}

/**
 * Dựng giao diện player. Nhận nguyên `queue` để lấy đủ trạng thái
 * (bài hiện tại, volume, queue, filter, loop, pause).
 */
function buildPlayerUI(queue) {
  const song      = queue.current;
  const filter    = queue.filter || 'default';
  const loopSong  = queue.loop;
  const loopQueue = queue.loopQueue;
  const volume    = queue.volume ?? 1;
  const upNext    = queue.songs?.[0];
  const queueLen  = queue.songs?.length || 0;
  const paused    = queue.player?.state?.status === AudioPlayerStatus.Paused;

  const filterInfo = AUDIO_FILTERS[filter] || AUDIO_FILTERS.default;
  const src        = SOURCE_LABELS[song.source] || SOURCE_LABELS.youtube;
  const volPct     = Math.round(volume * 100);

  // Footer: nguồn • trạng thái loop • filter (footer không render mention)
  const loopLabel = loopSong ? '🔂 Lặp bài' : loopQueue ? '🔁 Lặp queue' : null;
  const footerParts = [
    `${src.emoji} ${src.label}`,
    loopLabel,
    filter !== 'default' ? `${filterInfo.emoji} ${filterInfo.label}` : null,
    queue.autoplay ? '🎲 Autoplay' : null,
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setColor(paused ? 0x99AAB5 : 0x5865F2)
    .setAuthor({ name: paused ? '⏸️  Đang tạm dừng' : '🎵  Đang phát' })
    .setTitle(song.title)
    .setURL(song.url)
    .addFields(
      { name: '⏱️ Thời lượng', value: `\`${song.duration}\``, inline: true },
      { name: '🙋 Yêu cầu bởi', value: song.requestedBy ? `<@${song.requestedBy}>` : '—', inline: true },
      { name: `🔊 Âm lượng — ${volPct}%`, value: `\`${volumeBar(volume)}\``, inline: true },
    );

  if (upNext) {
    embed.addFields({
      name: queueLen > 1 ? `🎶 Tiếp theo  ·  +${queueLen - 1} bài trong queue` : '🎶 Tiếp theo',
      value: `${upNext.title} \`[${upNext.duration}]\``,
      inline: false,
    });
  }

  embed.setFooter({ text: footerParts.join('  •  ') });

  if (song.thumbnail) embed.setImage(song.thumbnail.replace('default', 'maxresdefault').replace('hqdefault', 'maxresdefault'));

  // Row 1 — điều khiển phát: trước · play/pause · skip · stop · queue
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_pause').setEmoji(paused ? '▶️' : '⏸️').setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('music_queue').setEmoji('📜').setLabel('Queue').setStyle(ButtonStyle.Secondary),
  );

  // Row 2 — âm lượng & chế độ: vol− · vol+ · loop bài · loop queue · shuffle
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('music_vol_down').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_vol_up').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_loop_song').setEmoji('🔂').setStyle(loopSong ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_loop_queue').setEmoji('🔁').setStyle(loopQueue ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('music_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
  );

  // Row 3 — Audio Filters group 1
  const filterSelect1 = new StringSelectMenuBuilder()
    .setCustomId('music_filter_1')
    .setPlaceholder(`🎛 Audio Filters (1) — ${FILTER_GROUP_1.includes(filter) && filter !== 'default' ? filterInfo.label : 'Default'}`)
    .addOptions(FILTER_GROUP_1.map(key => {
      const f = AUDIO_FILTERS[key];
      return { label: f.label, value: key, emoji: f.emoji, default: key === filter };
    }));

  // Row 4 — Audio Filters group 2
  const filterSelect2 = new StringSelectMenuBuilder()
    .setCustomId('music_filter_2')
    .setPlaceholder(`🎛 Audio Filters (2) — ${FILTER_GROUP_2.includes(filter) ? filterInfo.label : 'Select...'}`)
    .addOptions(FILTER_GROUP_2.map(key => {
      const f = AUDIO_FILTERS[key];
      return { label: f.label, value: key, emoji: f.emoji, default: key === filter };
    }));

  const row3 = new ActionRowBuilder().addComponents(filterSelect1);
  const row4 = new ActionRowBuilder().addComponents(filterSelect2);

  return { embeds: [embed], components: [row1, row2, row3, row4] };
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
      // Xuất PCM thô (s16le) thay vì Opus — bắt buộc để inline volume hoạt động.
      // discord.js sẽ tự encode lại sang Opus (qua @discordjs/opus).
      '-f', 's16le',
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

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw, // PCM s16le 48kHz stereo
      inlineVolume: true,
    });
    resource.volume?.setVolume(queue.volume);
    queue.player.play(resource);

    if (queue.playerMessage) {
      await queue.playerMessage.delete().catch(() => {});
      queue.playerMessage = null;
    }

    queue.playerMessage = await queue.textChannel.send(buildPlayerUI(queue));
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

  // Autoplay: chủ động nạp thêm bài trong background khi queue sắp hết
  if (queue.autoplay && queue.songs.length <= 1) {
    refillAutoplay(queue).catch(() => {});
  }

  const next = queue.songs.shift();
  if (next) return playSong(queue, next);

  // Queue rỗng
  const { t } = require('./i18n');

  // Autoplay: thử nạp thêm bài để phát liên tục
  if (queue.autoplay) {
    queue.current = null;
    refillAutoplay(queue)
      .then((added) => {
        const n = queue.songs.shift();
        if (n) return playSong(queue, n);
        // Không tìm được bài mới → tắt autoplay và kết thúc
        queue.autoplay = null;
        startIdleTimer(queue);
        queue.textChannel.send(t(queue.guildId, 'music_autoplay_exhausted'));
      })
      .catch(() => {
        queue.autoplay = null;
        startIdleTimer(queue);
        queue.textChannel.send(t(queue.guildId, 'music_queue_end'));
      });
    return;
  }

  queue.current = null;
  startIdleTimer(queue);
  queue.textChannel.send(t(queue.guildId, 'music_queue_end'));
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

module.exports = { getQueue, createQueue, deleteQueue, playSong, playNext, connect, searchYoutube, searchYoutubeList, getVideoById, getVideoDetails, getVideosByIds, getPlaylistItems, extractPlaylistId, extractVideoId, clearIdleTimer, formatDuration, buildPlayerUI, getCachedAudioUrl, refillAutoplay, AUDIO_FILTERS };
