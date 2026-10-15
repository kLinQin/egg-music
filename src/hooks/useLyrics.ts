import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import {
   fetchLyrics,
   fetchLyricsById,
   LyricsRateLimitError,
   type LyricsResult,
} from '../lib/lyrics';
import { fetchLyricsOvh } from '../lib/lyricsOvh';

export type LyricsProvider = 'lrclib' | 'lyricsovh';

type State = {
   loading: boolean;
   result: LyricsResult | null;
   error: string | null;
   manual: boolean;
};

const memoryCache = new Map<string, LyricsResult | null>();
const pendingRequests = new Map<string, Promise<LyricsResult | null>>();

const LS_PREFIX = 'lyrics-choice:';
const LS_PROVIDER = 'lyrics-provider';

// Simpan pilihan manual LRCLIB (by id)
type ManualChoice = {
   kind: 'lrclib';
   id: number;
   trackName: string;
   artistName: string;
};

// Simpan pilihan manual lyrics.ovh (by artist + title)
type ManualChoiceOvh = {
   kind: 'lyricsovh';
   artist: string;
   title: string;
};

type StoredChoice = ManualChoice | ManualChoiceOvh;

function loadChoice(trackId: string): StoredChoice | null {
   try {
      const raw = localStorage.getItem(LS_PREFIX + trackId);
      if (!raw) return null;
      return JSON.parse(raw) as StoredChoice;
   } catch {
      return null;
   }
}

function saveChoice(trackId: string, choice: StoredChoice) {
   try {
      localStorage.setItem(LS_PREFIX + trackId, JSON.stringify(choice));
   } catch {
      // ignore
   }
}

function clearChoice(trackId: string) {
   try {
      localStorage.removeItem(LS_PREFIX + trackId);
   } catch {
      // ignore
   }
}

function loadProvider(): LyricsProvider {
   try {
      const raw = localStorage.getItem(LS_PROVIDER);
      if (raw === 'lrclib' || raw === 'lyricsovh') return raw;
   } catch {
      // ignore
   }
   return 'lrclib';
}

function saveProvider(p: LyricsProvider) {
   try {
      localStorage.setItem(LS_PROVIDER, p);
   } catch {
      // ignore
   }
}

function errorMessage(err: unknown): string {
   if (err instanceof LyricsRateLimitError) {
      return 'Rate limit LRCLIB tercapai. Coba provider lain atau coba lagi nanti.';
   }
   return 'Gagal memuat lirik';
}

export function useLyrics(track: StoredTrack | null) {
   const [state, setState] = useState<State>({
      loading: false,
      result: null,
      error: null,
      manual: false,
   });

   const [provider, setProviderState] = useState<LyricsProvider>(loadProvider);

   const cacheRef = useRef(memoryCache);

   const applyResult = useCallback(
      (res: LyricsResult | null, error: string | null, manual: boolean) => {
         setState({ loading: false, result: res, error, manual });
      },
      []
   );

   const setProvider = useCallback((p: LyricsProvider) => {
      saveProvider(p);
      setProviderState(p);
   }, []);

   // ==== Manual LRCLIB (by id) ====
   const pickManual = useCallback(
      async (choice: { id: number; trackName: string; artistName: string }) => {
         if (!track) return;

         const cacheKey = `manual:${choice.id}`;
         const stored: ManualChoice = { kind: 'lrclib', ...choice };

         if (cacheRef.current.has(cacheKey)) {
            const cached = cacheRef.current.get(cacheKey) ?? null;
            saveChoice(track.id, stored);
            applyResult(cached, null, true);
            return;
         }

         setState({ loading: true, result: null, error: null, manual: true });

         try {
            const res = await fetchLyricsById(choice.id);
            cacheRef.current.set(cacheKey, res);
            saveChoice(track.id, stored);
            applyResult(res, null, true);
         } catch (err) {
            console.warn('[lyrics] gagal fetch manual:', err);
            applyResult(null, errorMessage(err), true);
         }
      },
      [track, applyResult]
   );

   // ==== Manual lyrics.ovh (by artist + title) ====
   const pickManualOvh = useCallback(
      async (artist: string, title: string) => {
         if (!track) return;

         const cacheKey = `ovh:${artist}|${title}`;
         const stored: ManualChoiceOvh = { kind: 'lyricsovh', artist, title };

         if (cacheRef.current.has(cacheKey)) {
            const cached = cacheRef.current.get(cacheKey) ?? null;
            saveChoice(track.id, stored);
            applyResult(cached, null, true);
            return;
         }

         setState({ loading: true, result: null, error: null, manual: true });

         try {
            const res = await fetchLyricsOvh(artist, title);
            cacheRef.current.set(cacheKey, res);
            saveChoice(track.id, stored);
            applyResult(res, null, true);
         } catch (err) {
            console.warn('[lyrics] gagal fetch lyrics.ovh manual:', err);
            applyResult(null, errorMessage(err), true);
         }
      },
      [track, applyResult]
   );

   const resetToAuto = useCallback(() => {
      if (!track) return;
      clearChoice(track.id);
      setState({ loading: true, result: null, error: null, manual: false });
   }, [track]);

   useEffect(() => {
      if (!track) {
         setState({ loading: false, result: null, error: null, manual: false });
         return;
      }

      const savedChoice = loadChoice(track.id);
      if (savedChoice) {
         if (savedChoice.kind === 'lrclib') {
            const cacheKey = `manual:${savedChoice.id}`;
            if (cacheRef.current.has(cacheKey)) {
               const cached = cacheRef.current.get(cacheKey) ?? null;
               applyResult(cached, null, true);
               return;
            }
            setState({ loading: true, result: null, error: null, manual: true });
            fetchLyricsById(savedChoice.id)
               .then((res) => {
                  cacheRef.current.set(cacheKey, res);
                  applyResult(res, null, true);
               })
               .catch((err) => {
                  console.warn('[lyrics] gagal fetch manual (saved):', err);
                  applyResult(null, errorMessage(err), true);
               });
            return;
         }

         // lyricsovh
         const cacheKey = `ovh:${savedChoice.artist}|${savedChoice.title}`;
         if (cacheRef.current.has(cacheKey)) {
            const cached = cacheRef.current.get(cacheKey) ?? null;
            applyResult(cached, null, true);
            return;
         }
         setState({ loading: true, result: null, error: null, manual: true });
         fetchLyricsOvh(savedChoice.artist, savedChoice.title)
            .then((res) => {
               cacheRef.current.set(cacheKey, res);
               applyResult(res, null, true);
            })
            .catch((err) => {
               console.warn('[lyrics] gagal fetch lyrics.ovh (saved):', err);
               applyResult(null, errorMessage(err), true);
            });
         return;
      }

      const title = track.title || track.name.replace(/\.[^.]+$/, '');
      const artist = track.artist || '';

      if (!artist) {
         applyResult(null, 'Artist tidak diketahui', false);
         return;
      }

      const baseKey = `${title}|${artist}`;
      const cacheKey = `${provider}:${baseKey}`;

      if (cacheRef.current.has(cacheKey)) {
         const cached = cacheRef.current.get(cacheKey) ?? null;
         applyResult(cached, null, false);
         return;
      }

      let cancelled = false;
      setState({ loading: true, result: null, error: null, manual: false });

      let promise = pendingRequests.get(cacheKey);
      if (!promise) {
         const fetcher =
            provider === 'lyricsovh'
               ? fetchLyricsOvh(artist, title)
               : fetchLyrics(title, artist, track.album, track.duration);

         promise = fetcher
            .then((res) => {
               cacheRef.current.set(cacheKey, res);
               return res;
            })
            .finally(() => {
               pendingRequests.delete(cacheKey);
            });
         pendingRequests.set(cacheKey, promise);
      }

      promise
         .then((res) => {
            if (cancelled) return;
            applyResult(res, null, false);
         })
         .catch((err) => {
            if (cancelled) return;
            console.warn('[lyrics] error:', err);
            applyResult(null, errorMessage(err), false);
         });

      return () => {
         cancelled = true;
      };
   }, [track, applyResult, provider]);

   return {
      ...state,
      provider,
      setProvider,
      pickManual,
      pickManualOvh,
      resetToAuto,
   };
}