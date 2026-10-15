import {
   getCachedLyrics,
   setCachedLyrics,
   getCachedById,
   setCachedById,
   getCachedSearch,
   setCachedSearch,
} from './lyricsCache';

export type LyricLine = {
   time: number;
   text: string;
};

export type LyricsResult = {
   synced: boolean;
   lines: LyricLine[];
   plain: string | null;
};

export type LyricsSearchItem = {
   id: number;
   trackName: string;
   artistName: string;
   albumName: string;
   duration: number;
   instrumental: boolean;
   hasSynced: boolean;
   hasPlain: boolean;
};

// Lewat Vite proxy — hindari CORS
const LRCLIB_BASE = '/api/lrclib';

// Throttle: minimal jeda antar request
const MIN_INTERVAL_MS = 400;
let lastRequestAt = 0;

async function throttledFetch(url: string): Promise<Response> {
   const now = Date.now();
   const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
   if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
   }
   lastRequestAt = Date.now();
   return fetch(url);
}

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

function normalizeResponse(data: {
   syncedLyrics?: string | null;
   plainLyrics?: string | null;
   instrumental?: boolean;
}): LyricsResult | null {
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
         lines: data.plainLyrics
            .split('\n')
            .map((text) => ({ time: 0, text })),
         plain: data.plainLyrics,
      };
   }

   return null;
}

export class LyricsRateLimitError extends Error {
   constructor() {
      super('Rate limit LRCLIB tercapai. Coba lagi nanti.');
      this.name = 'LyricsRateLimitError';
   }
}

export async function fetchLyrics(
   trackName: string,
   artistName: string,
   albumName?: string,
   duration?: number
): Promise<LyricsResult | null> {
   // Cek cache dulu
   const cached = getCachedLyrics(trackName, artistName, albumName, duration);
   if (cached !== null) {
      console.log('[lyrics] dari cache:', trackName);
      return cached;
   }

   const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
   });
   if (albumName) params.set('album_name', albumName);
   if (duration && duration >= 1 && duration <= 3600) {
      params.set('duration', String(Math.round(duration)));
   }

   const res = await throttledFetch(`${LRCLIB_BASE}/get?${params.toString()}`);

   if (res.status === 404) {
      setCachedLyrics(trackName, artistName, albumName, duration, null);
      return null;
   }
   if (res.status === 429) {
      throw new LyricsRateLimitError();
   }
   if (!res.ok) return null;

   const data = await res.json();
   const result = normalizeResponse(data);

   setCachedLyrics(trackName, artistName, albumName, duration, result);
   return result;
}

/**
 * Cari lirik pakai query bebas.
 */
export async function searchLyrics(query: string): Promise<LyricsSearchItem[]> {
   const trimmed = query.trim();
   if (!trimmed) return [];

   // Cek cache search
   const cached = getCachedSearch(trimmed);
   if (cached !== null) {
      console.log('[lyrics] search dari cache:', trimmed);
      return cached;
   }

   const params = new URLSearchParams({ q: trimmed });

   const res = await throttledFetch(`${LRCLIB_BASE}/search?${params.toString()}`);

   if (res.status === 429) {
      throw new LyricsRateLimitError();
   }
   if (!res.ok) return [];

   const data = await res.json();
   if (!Array.isArray(data)) return [];

   const results: LyricsSearchItem[] = data.map(
      (item: {
         id: number;
         trackName: string;
         artistName: string;
         albumName?: string;
         duration?: number;
         instrumental?: boolean;
         syncedLyrics?: string | null;
         plainLyrics?: string | null;
      }): LyricsSearchItem => ({
         id: item.id,
         trackName: item.trackName,
         artistName: item.artistName,
         albumName: item.albumName ?? '',
         duration: item.duration ?? 0,
         instrumental: !!item.instrumental,
         hasSynced: !!item.syncedLyrics,
         hasPlain: !!item.plainLyrics,
      })
   );

   setCachedSearch(trimmed, results);
   return results;
}

/**
 * Ambil lirik lengkap dari hasil search (by id).
 */
export async function fetchLyricsById(id: number): Promise<LyricsResult | null> {
   // Cek cache by id
   const cached = getCachedById(id);
   if (cached !== null) {
      console.log('[lyrics] by id dari cache:', id);
      return cached;
   }

   const res = await throttledFetch(`${LRCLIB_BASE}/get/${id}`);

   if (res.status === 429) {
      throw new LyricsRateLimitError();
   }
   if (!res.ok) return null;

   const data = await res.json();
   const result = normalizeResponse(data);

   setCachedById(id, result);
   return result;
}