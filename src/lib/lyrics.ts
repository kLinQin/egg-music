
export type LyricLine = {
   time: number;
   text: string;
};

export type LyricsResult = {
   synced: boolean;
   lines: LyricLine[];
   plain: string | null;
};

const LRCLIB_BASE = 'https://lrclib.net/api';

function parseLRC(lrc: string): LyricLine[] {
   const lines: LyricLine[] = [];
   const regex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)/;

   for (const raw of lrc.split('\n')) {
      const match = raw.match(regex);
      if (!match) continue;

      const [, min, sec, ms, text] = match;
      const msVal = ms ? parseInt(ms.padEnd(3, '0'), 10) : 0;
      const time = parseInt(min, 10) * 60 + parseInt(sec, 10) + msVal / 1000;

      const clean = text.trim();
      if (clean) lines.push({ time, text: clean });
   }

   return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLyrics(
   trackName: string,
   artistName: string,
   albumName?: string,
   duration?: number
): Promise<LyricsResult | null> {
   const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
   });
   if (albumName) params.set('album_name', albumName);
   if (duration && duration >= 1 && duration <= 3600) {
      params.set('duration', String(Math.round(duration)));
   }

   const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
      headers: { 'Lrclib-Client': 'music-player-local/1.0' },
   });

   if (res.status === 404) return null;
   if (res.status === 429) {
      console.warn('[lyrics] rate limited');
      return null;
   }
   if (!res.ok) return null;

   const data = await res.json();
   if (data.instrumental) return null;

   if (data.syncedLyrics) {
      return {
         synced: true,
         lines: parseLRC(data.syncedLyrics),
         plain: data.plainLyrics ?? null,
      };
   }

   if (data.plainLyrics) {
      return {
         synced: false,
         lines: data.plainLyrics.split('\n').map((text: string) => ({ time: 0, text })),
         plain: data.plainLyrics,
      };
   }

   return null;
}