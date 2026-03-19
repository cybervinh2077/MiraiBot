async function getLyrics(title) {
  // Parse "Artist - Song Title" từ YouTube title
  const parts = title.split(' - ');
  let artist, song;

  if (parts.length >= 2) {
    artist = parts[0].trim();
    song = parts.slice(1).join(' - ').trim()
      // Xóa các tag thừa như (Music Video), [Official], (Lyrics), v.v.
      .replace(/\(.*?\)|\[.*?\]/g, '').trim();
  } else {
    artist = title;
    song = title;
  }

  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
    );
    const data = await res.json();
    if (data.lyrics) return { lyrics: data.lyrics, artist, song };
    return null;
  } catch {
    return null;
  }
}

module.exports = { getLyrics };
