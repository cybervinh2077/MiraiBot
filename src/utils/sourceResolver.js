/**
 * sourceResolver.js
 * Detect và resolve metadata từ Spotify, Apple Music, SoundCloud, YouTube.
 *
 * Spotify / Apple Music: không có public audio API → lấy metadata → search YouTube
 * SoundCloud: yt-dlp hỗ trợ native → stream trực tiếp, chỉ cần lấy metadata
 */

const { exec } = require('yt-dlp-exec');

// ─── URL detectors ────────────────────────────────────────────────────────────
function detectSource(url) {
  if (/open\.spotify\.com/.test(url))  return 'spotify';
  if (/music\.apple\.com/.test(url))   return 'apple';
  if (/soundcloud\.com/.test(url))     return 'soundcloud';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  return null;
}

function isPlaylistUrl(url) {
  if (/open\.spotify\.com\/(playlist|album)/.test(url))  return true;
  if (/music\.apple\.com.*\/(playlist|album)/.test(url)) return true;
  if (/soundcloud\.com\/.*\/sets\//.test(url))           return true;
  if (/[?&]list=/.test(url))                             return true;
  return false;
}

// ─── Spotify ──────────────────────────────────────────────────────────────────
let _spotifyToken = null;
let _spotifyTokenExpiry = 0;

async function getSpotifyToken() {
  if (_spotifyToken && Date.now() < _spotifyTokenExpiry) return _spotifyToken;
  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!data.access_token) return null;
  _spotifyToken = data.access_token;
  _spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _spotifyToken;
}

function extractSpotifyId(url) {
  const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  return match ? { type: match[1], id: match[2] } : null;
}

async function resolveSpotifyTrack(trackId) {
  const token = await getSpotifyToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.name) return null;
  return {
    title:     `${data.artists.map(a => a.name).join(', ')} - ${data.name}`,
    artist:    data.artists[0]?.name || '',
    song:      data.name,
    thumbnail: data.album?.images?.[0]?.url || null,
    duration:  formatMs(data.duration_ms),
    sourceUrl: data.external_urls?.spotify || null,
  };
}

async function resolveSpotifyPlaylist(playlistId) {
  const token = await getSpotifyToken();
  if (!token) return [];
  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=next,items(track(name,artists,duration_ms,album(images),external_urls))`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.items) break;
    for (const item of data.items) {
      const t = item.track;
      if (!t?.name) continue;
      tracks.push({
        title:     `${t.artists.map(a => a.name).join(', ')} - ${t.name}`,
        artist:    t.artists[0]?.name || '',
        song:      t.name,
        thumbnail: t.album?.images?.[0]?.url || null,
        duration:  formatMs(t.duration_ms),
        sourceUrl: t.external_urls?.spotify || null,
      });
    }
    url = data.next || null;
  }
  return tracks;
}

async function resolveSpotifyAlbum(albumId) {
  const token = await getSpotifyToken();
  if (!token) return [];
  const tracks = [];
  let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

  // Get album info for thumbnail
  const albumRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const albumData = await albumRes.json();
  const thumbnail = albumData.images?.[0]?.url || null;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!data.items) break;
    for (const t of data.items) {
      if (!t?.name) continue;
      tracks.push({
        title:     `${t.artists.map(a => a.name).join(', ')} - ${t.name}`,
        artist:    t.artists[0]?.name || '',
        song:      t.name,
        thumbnail,
        duration:  formatMs(t.duration_ms),
        sourceUrl: t.external_urls?.spotify || null,
      });
    }
    url = data.next || null;
  }
  return tracks;
}

// ─── Apple Music ──────────────────────────────────────────────────────────────
// Apple Music không có public API → dùng oEmbed / scrape title từ page
// Cách đơn giản nhất: parse URL để lấy tên bài từ slug
function extractAppleMusicInfo(url) {
  // https://music.apple.com/vn/album/song-name/id?i=trackid
  // https://music.apple.com/us/album/album-name/id
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    // parts: ['vn', 'album', 'song-name', 'id'] hoặc ['us', 'song', 'song-name', 'id']
    const nameSlug = parts[2] || '';
    const name = nameSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { title: name, isPlaylist: parts[1] === 'playlist' };
  } catch {
    return null;
  }
}

// ─── SoundCloud ───────────────────────────────────────────────────────────────
// yt-dlp hỗ trợ SoundCloud native — dùng để lấy metadata + audio URL
async function resolveSoundCloud(url) {
  let result;
  try {
    result = await exec(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true,
      socketTimeout: 15,
    });
  } catch (e) {
    result = e;
  }

  let info = result;
  if (result && typeof result === 'object' && 'stdout' in result) {
    try { info = JSON.parse(result.stdout); } catch { return null; }
  }

  if (!info?.title) return null;

  return {
    title:     info.title,
    artist:    info.uploader || '',
    song:      info.title,
    thumbnail: info.thumbnail || null,
    duration:  info.duration ? formatSeconds(info.duration) : '??:??',
    sourceUrl: url,
    directUrl: url, // SoundCloud: dùng URL gốc, yt-dlp sẽ extract khi play
  };
}

async function resolveSoundCloudPlaylist(url) {
  let result;
  try {
    result = await exec(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true,
      socketTimeout: 20,
    });
  } catch (e) {
    result = e;
  }

  let info = result;
  if (result && typeof result === 'object' && 'stdout' in result) {
    try { info = JSON.parse(result.stdout); } catch { return []; }
  }

  if (!info?.entries) return [];
  return info.entries.map(e => ({
    title:     e.title,
    artist:    e.uploader || '',
    song:      e.title,
    thumbnail: e.thumbnail || null,
    duration:  e.duration ? formatSeconds(e.duration) : '??:??',
    sourceUrl: e.webpage_url || url,
    directUrl: e.webpage_url || url,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMs(ms) {
  if (!ms) return '??:??';
  const s = Math.floor(ms / 1000);
  return formatSeconds(s);
}

function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Main resolver ────────────────────────────────────────────────────────────
/**
 * Resolve một URL thành song object(s) sẵn sàng để add vào queue.
 * Returns: { type: 'single'|'playlist', songs: [...], playlistName }
 * Mỗi song: { title, thumbnail, duration, sourceUrl, directUrl?, searchQuery? }
 * - directUrl: có nghĩa là stream trực tiếp (SoundCloud)
 * - searchQuery: cần search YouTube để lấy audio (Spotify, Apple Music)
 */
async function resolveUrl(url) {
  const source = detectSource(url);

  // ── Spotify ──────────────────────────────────────────────────────────────
  if (source === 'spotify') {
    const info = extractSpotifyId(url);
    if (!info) return null;

    if (info.type === 'track') {
      const track = await resolveSpotifyTrack(info.id);
      if (!track) return null;
      return {
        type: 'single',
        songs: [{ ...track, searchQuery: `${track.artist} ${track.song}` }],
      };
    }

    if (info.type === 'playlist') {
      const tracks = await resolveSpotifyPlaylist(info.id);
      if (!tracks.length) return null;
      return {
        type: 'playlist',
        playlistName: 'Spotify Playlist',
        songs: tracks.map(t => ({ ...t, searchQuery: `${t.artist} ${t.song}` })),
      };
    }

    if (info.type === 'album') {
      const tracks = await resolveSpotifyAlbum(info.id);
      if (!tracks.length) return null;
      return {
        type: 'playlist',
        playlistName: 'Spotify Album',
        songs: tracks.map(t => ({ ...t, searchQuery: `${t.artist} ${t.song}` })),
      };
    }
  }

  // ── Apple Music ───────────────────────────────────────────────────────────
  if (source === 'apple') {
    const info = extractAppleMusicInfo(url);
    if (!info) return null;
    // Apple Music: chỉ có tên bài từ URL slug → search YouTube
    return {
      type: 'single',
      songs: [{ title: info.title, thumbnail: null, duration: '??:??', sourceUrl: url, searchQuery: info.title }],
    };
  }

  // ── SoundCloud ────────────────────────────────────────────────────────────
  if (source === 'soundcloud') {
    if (isPlaylistUrl(url)) {
      const tracks = await resolveSoundCloudPlaylist(url);
      if (!tracks.length) return null;
      return {
        type: 'playlist',
        playlistName: 'SoundCloud Set',
        songs: tracks.map(t => ({ ...t, directUrl: t.sourceUrl })),
      };
    }
    const track = await resolveSoundCloud(url);
    if (!track) return null;
    return { type: 'single', songs: [track] };
  }

  return null; // YouTube handled separately
}

module.exports = { detectSource, isPlaylistUrl, resolveUrl, formatSeconds };
