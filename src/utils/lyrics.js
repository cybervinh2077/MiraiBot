const GENIUS_TOKEN = process.env.GENIUS_TOKEN;

// Parse "Artist - Song" từ YouTube title
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

// Genius API search
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
    return {
      title: hit.title,
      artist: hit.primary_artist.name,
      url: hit.url,
    };
  } catch {
    return null;
  }
}

// Scrape lyrics từ Genius page
async function scrapeGeniusLyrics(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await res.text();

    // Genius lưu lyrics trong các div data-lyrics-container
    const matches = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
    if (!matches.length) return null;

    let lyrics = matches
      .map(m => m[1])
      .join('\n')
      // Chuyển <br> thành newline
      .replace(/<br\s*\/?>/gi, '\n')
      // Xóa tất cả HTML tags còn lại
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    return lyrics || null;
  } catch {
    return null;
  }
}

// Fallback: lyrics.ovh
async function lyricsOvh(artist, song) {
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist || song)}/${encodeURIComponent(song)}`
    );
    const data = await res.json();
    return data.lyrics || null;
  } catch {
    return null;
  }
}

async function getLyrics(title) {
  const { artist, song } = parseTitle(title);
  const query = artist ? `${artist} ${song}` : song;

  // 1. Thử Genius trước
  if (GENIUS_TOKEN) {
    const hit = await searchGenius(query);
    if (hit) {
      const lyrics = await scrapeGeniusLyrics(hit.url);
      if (lyrics) {
        return { lyrics, artist: hit.artist, song: hit.title };
      }
    }
  }

  // 2. Fallback sang lyrics.ovh
  const ovhLyrics = await lyricsOvh(artist, song);
  if (ovhLyrics) {
    return { lyrics: ovhLyrics, artist, song };
  }

  return null;
}

module.exports = { getLyrics };
