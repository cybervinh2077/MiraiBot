const GENIUS_TOKEN = process.env.GENIUS_TOKEN;

function parseTitle(title) {
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

// Lấy lyrics qua Genius song detail API (có embed lyrics trong một số trường hợp)
// Fallback: dùng lyrics.ovh vì Genius API không trả lyrics trực tiếp ở free tier
async function lyricsOvh(artist, song) {
  try {
    const query = artist ? `${artist} ${song}` : song;
    // Thử với artist + song
    if (artist) {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
      );
      const data = await res.json();
      if (data.lyrics) return data.lyrics;
    }
    // Thử chỉ với song title
    const res2 = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(song)}/${encodeURIComponent(song)}`
    );
    const data2 = await res2.json();
    return data2.lyrics || null;
  } catch {
    return null;
  }
}

// lrclib.net - API miễn phí, không cần key, có lyrics synced
async function lrclibSearch(artist, song) {
  try {
    const query = artist ? `${artist} ${song}` : song;
    const res = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (!data?.length) return null;
    // Ưu tiên bài có plainLyrics
    const hit = data.find(d => d.plainLyrics) || data[0];
    if (!hit?.plainLyrics) return null;
    return { lyrics: hit.plainLyrics, artist: hit.artistName, song: hit.trackName };
  } catch {
    return null;
  }
}

async function getLyrics(title) {
  const { artist, song } = parseTitle(title);

  // 1. Thử lrclib trước (miễn phí, không cần key, ổn định)
  const lrcResult = await lrclibSearch(artist, song);
  if (lrcResult) return lrcResult;

  // 2. Thử Genius search + lyrics.ovh với tên chính xác từ Genius
  if (GENIUS_TOKEN) {
    const query = artist ? `${artist} ${song}` : song;
    const hit = await searchGenius(query);
    if (hit) {
      const ovhLyrics = await lyricsOvh(hit.artist, hit.title);
      if (ovhLyrics) return { lyrics: ovhLyrics, artist: hit.artist, song: hit.title };
    }
  }

  // 3. Fallback lyrics.ovh với title gốc
  const ovhLyrics = await lyricsOvh(artist, song);
  if (ovhLyrics) return { lyrics: ovhLyrics, artist, song };

  return null;
}

module.exports = { getLyrics };
