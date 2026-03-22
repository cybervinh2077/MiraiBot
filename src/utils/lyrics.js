const GENIUS_TOKEN = process.env.GENIUS_TOKEN;

function parseTitle(title) {
  // Xử lý các dạng: "Artist - Song", "Song (Official Video)", v.v.
  const parts = title.split(' - ');
  let artist, song;
  if (parts.length >= 2) {
    artist = parts[0].trim();
    song = parts.slice(1).join(' - ').trim()
      .replace(/\(.*?\)|\[.*?\]/g, '').trim();
  } else {
    artist = '';
    song = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  }
  return { artist, song };
}

// Normalize string để so sánh: lowercase, bỏ ký tự đặc biệt
function normalize(str) {
  return (str || '').toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tính điểm khớp giữa candidate và query artist/song
function scoreMatch(candidate, queryArtist, querySong) {
  const cArtist = normalize(candidate.artistName || '');
  const cTrack  = normalize(candidate.trackName  || '');
  const qArtist = normalize(queryArtist);
  const qSong   = normalize(querySong);

  let score = 0;

  // Song title match (quan trọng nhất)
  if (cTrack === qSong) score += 100;
  else if (cTrack.includes(qSong) || qSong.includes(cTrack)) score += 60;

  // Artist match
  if (qArtist) {
    if (cArtist === qArtist) score += 80;
    else if (cArtist.includes(qArtist) || qArtist.includes(cArtist)) score += 40;
  }

  // Ưu tiên bài có lyrics
  if (candidate.plainLyrics) score += 10;

  return score;
}

// Genius search → trả về song id + info
async function searchGenius(query) {
  if (!GENIUS_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
      { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` } }
    );
    const data = await res.json();
    const hit = data.response?.hits?.[0]?.result;
    if (!hit) return null;
    return { id: hit.id, title: hit.title, artist: hit.primary_artist.name };
  } catch {
    return null;
  }
}

// lyrics.ovh fallback
async function lyricsOvh(artist, song) {
  try {
    if (artist) {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
      );
      const data = await res.json();
      if (data.lyrics) return data.lyrics;
    }
    const res2 = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(song)}/${encodeURIComponent(song)}`
    );
    const data2 = await res2.json();
    return data2.lyrics || null;
  } catch {
    return null;
  }
}

// lrclib.net — chọn kết quả khớp nhất với artist + song
async function lrclibSearch(artist, song) {
  try {
    const query = artist ? `${artist} ${song}` : song;
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (!data?.length) return null;

    // Score tất cả kết quả, chọn cái khớp nhất
    const scored = data
      .filter(d => d.plainLyrics)
      .map(d => ({ ...d, _score: scoreMatch(d, artist, song) }))
      .sort((a, b) => b._score - a._score);

    if (!scored.length) return null;

    const best = scored[0];
    // Nếu score quá thấp (< 50) thì không tin tưởng kết quả
    if (best._score < 50) return null;

    return { lyrics: best.plainLyrics, artist: best.artistName, song: best.trackName };
  } catch {
    return null;
  }
}

async function getLyrics(title, artistHint = '') {
  const { artist, song } = parseTitle(title);
  // Nếu có artistHint từ bên ngoài (ví dụ từ YouTube channel name), ưu tiên dùng
  const effectiveArtist = artist || artistHint;

  // 1. Thử lrclib với artist + song (có scoring)
  const lrcResult = await lrclibSearch(effectiveArtist, song);
  if (lrcResult) return lrcResult;

  // 2. Thử Genius search → lấy tên chính xác → lyrics.ovh
  if (GENIUS_TOKEN) {
    const query = effectiveArtist ? `${effectiveArtist} ${song}` : song;
    const hit = await searchGenius(query);
    if (hit) {
      const ovhLyrics = await lyricsOvh(hit.artist, hit.title);
      if (ovhLyrics) return { lyrics: ovhLyrics, artist: hit.artist, song: hit.title };
    }
  }

  // 3. Fallback lyrics.ovh với title gốc
  const ovhLyrics = await lyricsOvh(effectiveArtist, song);
  if (ovhLyrics) return { lyrics: ovhLyrics, artist: effectiveArtist, song };

  return null;
}

module.exports = { getLyrics };
