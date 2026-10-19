import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import {
   getManualLyrics,
   setManualLyrics,
   deleteManualLyrics,
} from '../lib/db';
import {
   fetchLyrics,
   fetchLyricsById,
   LyricsRateLimitError,
   type LyricsResult,
   type LyricLine,
} from '../lib/lyrics';
import { fetchLyricsOvh } from '../lib/lyricsOvh';

export type LyricsProvider = 'lrclib' | 'lyricsovh' | 'manual';

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

type ManualChoice = {
   kind: 'lrclib';
   id: number;
   trackName: string;
   artistName: string;
};

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
      if (raw === 'lrclib' || raw === 'lyricsovh' || raw === 'manual') return raw;
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

// ===== Parser LRC inline (hanya untuk lirik manual) =====
function parseManualText(text: string): LyricsResult {
   const trimmed = text.trim();
   const lrcRegex = /\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)/;

   const lines: LyricLine[] = [];
   let hasTimestamp = false;

   for (const raw of trimmed.split('\n')) {
      const match = raw.match(lrcRegex);
      if (match) {
         hasTimestamp = true;
         const [, min, sec, ms, lyricText] = match;
         const msVal = ms ? parseInt(ms.padEnd(3, '0'), 10) : 0;
         const time =
            parseInt(min, 10) * 60 + parseInt(sec, 10) + msVal / 1000;
         const clean = lyricText.trim();
         if (clean) lines.push({ time, text: clean });
      } else {
         const clean = raw.trim();
         if (clean) lines.push({ time: 0, text: clean });
      }
   }

   if (hasTimestamp) {
      lines.sort((a, b) => a.time - b.time);
      return { synced: true, lines, plain: null };
   }

   return { synced: false, lines, plain: trimmed };
}

export function useLyrics(track: StoredTrack | null) {
   const [state, setState] = useState<State>({
      loading: false,
      result: null,
      error: null,
      manual: false,
   });

   const [provider, setProviderState] = useState<LyricsProvider>(loadProvider);
   const [hasManual, setHasManual] = useState(false);

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

   // ==== Simpan lirik manual (paste/ketik) ====
   const saveManualText = useCallback(
      async (text: string) => {
         if (!track) return;
         const trimmed = text.trim();
         if (!trimmed) return;

         await setManualLyrics(track.id, trimmed);
         clearChoice(track.id);
         saveProvider('manual');
         setProviderState('manual');
         setHasManual(true);

         const parsed = parseManualText(trimmed);
         cacheRef.current.set(`manualText:${track.id}`, parsed);
         applyResult(parsed, null, false);
      },
      [track, applyResult]
   );

   // ==== Hapus lirik manual ====
   const deleteManualText = useCallback(async () => {
      if (!track) return;
      await deleteManualLyrics(track.id);
      cacheRef.current.delete(`manualText:${track.id}`);
      setHasManual(false);
      saveProvider('lrclib');
      setProviderState('lrclib');
      setState({ loading: true, result: null, error: null, manual: false });
   }, [track]);

   const resetToAuto = useCallback(() => {
      if (!track) return;
      clearChoice(track.id);
      setState({ loading: true, result: null, error: null, manual: false });
   }, [track]);

   useEffect(() => {
      if (!track) {
         setState({ loading: false, result: null, error: null, manual: false });
         setHasManual(false);
         return;
      }

      let cancelled = false;

      const load = async () => {
         // ==== Prioritas 1: lirik manual tersimpan ====
         const manualEntry = await getManualLyrics(track.id);
         if (cancelled) return;

         if (manualEntry) {
            const cacheKey = `manualText:${track.id}`;
            let parsed = cacheRef.current.get(cacheKey);
            if (!parsed) {
               parsed = parseManualText(manualEntry.text);
               cacheRef.current.set(cacheKey, parsed);
            }
            setHasManual(true);
            applyResult(parsed, null, false);
            return;
         }

         setHasManual(false);

         // ==== Prioritas 2: pilihan manual (LRCLIB by id / lyrics.ovh) ====
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
                     if (cancelled) return;
                     cacheRef.current.set(cacheKey, res);
                     applyResult(res, null, true);
                  })
                  .catch((err) => {
                     if (cancelled) return;
                     console.warn('[lyrics] gagal fetch manual (saved):', err);
                     applyResult(null, errorMessage(err), true);
                  });
               return;
            }

            const cacheKey = `ovh:${savedChoice.artist}|${savedChoice.title}`;
            if (cacheRef.current.has(cacheKey)) {
               const cached = cacheRef.current.get(cacheKey) ?? null;
               applyResult(cached, null, true);
               return;
            }
            setState({ loading: true, result: null, error: null, manual: true });
            fetchLyricsOvh(savedChoice.artist, savedChoice.title)
               .then((res) => {
                  if (cancelled) return;
                  cacheRef.current.set(cacheKey, res);
                  applyResult(res, null, true);
               })
               .catch((err) => {
                  if (cancelled) return;
                  console.warn('[lyrics] gagal fetch lyrics.ovh (saved):', err);
                  applyResult(null, errorMessage(err), true);
               });
            return;
         }

         // ==== Prioritas 3: provider manual (tapi belum ada teks) ====
         if (provider === 'manual') {
            setState({ loading: false, result: null, error: null, manual: false });
            return;
         }

         // ==== Prioritas 4: provider otomatis ====
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
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [track, applyResult, provider]);

   return {
      ...state,
      provider,
      hasManual,
      setProvider,
      pickManual,
      pickManualOvh,
      saveManualText,
      deleteManualText,
      resetToAuto,
   };
}