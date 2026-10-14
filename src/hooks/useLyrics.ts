import { useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import { fetchLyrics, type LyricsResult } from '../lib/lyrics';

type State = {
   loading: boolean;
   result: LyricsResult | null;
   error: string | null;
};

const memoryCache = new Map<string, LyricsResult | null>();
const pendingRequests = new Map<string, Promise<LyricsResult | null>>();

export function useLyrics(track: StoredTrack | null) {
   const [state, setState] = useState<State>({
      loading: false,
      result: null,
      error: null,
   });

   const cacheRef = useRef(memoryCache);

   useEffect(() => {
      if (!track) {
         setState({ loading: false, result: null, error: null });
         return;
      }

      const title = track.title || track.name.replace(/\.[^.]+$/, '');
      const artist = track.artist || '';

      if (!artist) {
         setState({ loading: false, result: null, error: 'Artist tidak diketahui' });
         return;
      }

      const cacheKey = `${title}|${artist}`;

      // Cek cache
      if (cacheRef.current.has(cacheKey)) {
         const cached = cacheRef.current.get(cacheKey) ?? null;
         setState({ loading: false, result: cached, error: null });
         return;
      }

      let cancelled = false;
      setState({ loading: true, result: null, error: null });

      // Cek pending request (hindari double fetch kalau ada 2 komponen minta lirik sama)
      let promise = pendingRequests.get(cacheKey);
      if (!promise) {
         promise = fetchLyrics(title, artist, track.album, track.duration)
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
            setState({ loading: false, result: res, error: null });
         })
         .catch((err) => {
            if (cancelled) return;
            setState({ loading: false, result: null, error: 'Gagal memuat lirik' });
            console.warn('[lyrics] error:', err);
         });

      return () => {
         cancelled = true;
      };
   }, [track]);

   return state;
}