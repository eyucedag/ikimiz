export interface SongMetadata {
  title: string;
  artist: string;
}

interface OEmbedResponse {
  title?: unknown;
  author_name?: unknown;
}

const providerFor = (url: URL): 'spotify' | 'youtube' | 'apple' | null => {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'open.spotify.com' || host === 'spotify.link') return 'spotify';
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'music.youtube.com') return 'youtube';
  if (host === 'music.apple.com') return 'apple';
  return null;
};

export function parseSongMetadata(provider: 'spotify' | 'youtube' | 'apple', payload: OEmbedResponse): SongMetadata | null {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const author = typeof payload.author_name === 'string' ? payload.author_name.trim() : '';
  if (!title) return null;

  if (provider === 'youtube') {
    const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
    if (byMatch) return { title: byMatch[1].trim(), artist: byMatch[2].trim() };
    const dashMatch = title.match(/^(.+?)\s+[–—-]\s+(.+)$/);
    if (dashMatch) return { title: dashMatch[2].trim(), artist: dashMatch[1].trim() };
  }

  return author ? { title, artist: author } : null;
}

export const songMetadataService = {
  async lookup(rawUrl: string): Promise<SongMetadata | null> {
    let url: URL;
    try { url = new URL(rawUrl.trim()); } catch { return null; }
    const provider = providerFor(url);
    if (!provider) return null;

    const endpoint = provider === 'spotify'
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url.toString())}`
      : provider === 'apple'
        ? `https://embed.music.apple.com/oembed?url=${encodeURIComponent(url.toString())}`
        : `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const payload = await response.json() as OEmbedResponse;
      return parseSongMetadata(provider, payload);
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
};
