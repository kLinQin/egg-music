import { useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import { fetchLyrics, type LyricsResult } from '../lib/lyrics';

type State = {
   loading: boolean;
   result: LyricsResult | null;
   error: string | null;
};

export function useLyrics(track: StoredTrack | null) {
   const [state, setState] = useState<State>({
      loading: false,
      result: null,
      error: null,
   });

   const cacheRef = useRef<Map<string, LyricsResult | null>>(new Map());

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
      const cached = cacheRef.current.get(cacheKey);
      if (cached !== undefined) {
         setState({ loading: false, result: cached, error: null });
         return;
      }

      let cancelled = false;
      setState({ loading: true, result: null, error: null });

      fetchLyrics(title, artist, track.album, track.duration)
         .then((res) => {
            if (cancelled) return;
            cacheRef.current.set(cacheKey, res);
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