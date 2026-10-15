import type { LyricsResult, LyricsSearchItem } from './lyrics';

const CACHE_VERSION = 1;
const TTL_LYRICS_MS = 1000 * 60 * 60 * 24 * 30; // 30 hari
const TTL_SEARCH_MS = 1000 * 60 * 60 * 24 * 7;  // 7 hari
const LS_PREFIX = `lrclib-cache-v${CACHE_VERSION}:`;

type CacheEntry<T> = {
   value: T;
   expires: number;
};

function readEntry<T>(key: string): T | null {
   try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() > entry.expires) {
         localStorage.removeItem(LS_PREFIX + key);
         return null;
      }
      return entry.value;
   } catch {
      return null;
   }
}

function writeEntry<T>(key: string, value: T, ttl: number) {
   try {
      const entry: CacheEntry<T> = { value, expires: Date.now() + ttl };
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
   } catch {
      // quota penuh — abaikan
   }
}

function lyricsKey(trackName: string, artistName: string, albumName?: string, duration?: number): string {
   return `lyrics:${trackName}|${artistName}|${albumName ?? ''}|${duration ?? 0}`;
}

function searchKey(query: string): string {
   return `search:${query.trim().toLowerCase()}`;
}

function byIdKey(id: number): string {
   return `byid:${id}`;
}

export function getCachedLyrics(
   trackName: string,
   artistName: string,
   albumName?: string,
   duration?: number
): LyricsResult | null {
   return readEntry<LyricsResult>(lyricsKey(trackName, artistName, albumName, duration));
}

export function setCachedLyrics(
   trackName: string,
   artistName: string,
   albumName: string | undefined,
   duration: number | undefined,
   result: LyricsResult | null
) {
   writeEntry(lyricsKey(trackName, artistName, albumName, duration), result, TTL_LYRICS_MS);
}

export function getCachedById(id: number): LyricsResult | null {
   return readEntry<LyricsResult>(byIdKey(id));
}

export function setCachedById(id: number, result: LyricsResult | null) {
   writeEntry(byIdKey(id), result, TTL_LYRICS_MS);
}

export function getCachedSearch(query: string): LyricsSearchItem[] | null {
   return readEntry<LyricsSearchItem[]>(searchKey(query));
}

export function setCachedSearch(query: string, results: LyricsSearchItem[]) {
   writeEntry(searchKey(query), results, TTL_SEARCH_MS);
}

export function clearLyricsCache() {
   try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
         const k = localStorage.key(i);
         if (k && k.startsWith(LS_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
   } catch {
      // ignore
   }
}