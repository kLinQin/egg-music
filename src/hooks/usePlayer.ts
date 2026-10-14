import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import { trackToUrl, coverToUrl } from '../lib/audio';
import { initEq, resumeEq } from '../lib/eq';

export type RepeatMode = 'off' | 'all' | 'one';

export function usePlayer(tracks: StoredTrack[]) {
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const urlRef = useRef<string | null>(null);
   const coverUrlRef = useRef<string | null>(null);
   const eqInitializedRef = useRef(false);

   const [currentId, setCurrentId] = useState<string | null>(null);
   const [isPlaying, setIsPlaying] = useState(false);
   const [duration, setDuration] = useState(0);
   const [currentTime, setCurrentTime] = useState(0);
   const [volume, setVolume] = useState(1);
   const [shuffle, setShuffle] = useState(false);
   const [repeat, setRepeat] = useState<RepeatMode>('off');
   const [coverUrl, setCoverUrl] = useState<string | null>(null);

   const currentTrack = tracks.find((t) => t.id === currentId) ?? null;

   // Setup EQ sekali saat audio element siap
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio || eqInitializedRef.current) return;
      try {
         initEq(audio);
         eqInitializedRef.current = true;
      } catch (err) {
         console.warn('[eq] gagal init:', err);
      }
   }, []);

   // Load audio saat currentId berubah
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!currentTrack) {
         audio.pause();
         audio.removeAttribute('src');
         if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
         }
         return;
      }

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = trackToUrl(currentTrack);
      urlRef.current = url;
      audio.src = url;
      audio.load();
   }, [currentTrack]);

   // Load cover saat track berubah
   useEffect(() => {
      if (coverUrlRef.current) {
         URL.revokeObjectURL(coverUrlRef.current);
         coverUrlRef.current = null;
      }
      if (!currentTrack) {
         setCoverUrl(null);
         return;
      }
      const url = coverToUrl(currentTrack);
      coverUrlRef.current = url;
      setCoverUrl(url);
   }, [currentTrack]);

   useEffect(() => {
      return () => {
         if (urlRef.current) URL.revokeObjectURL(urlRef.current);
         if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
      };
   }, []);

   const play = useCallback(async () => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return;
      try {
         await resumeEq();
         await audio.play();
         setIsPlaying(true);
      } catch {
         setIsPlaying(false);
      }
   }, []);

   const pause = useCallback(() => {
      audioRef.current?.pause();
      setIsPlaying(false);
   }, []);

   const toggle = useCallback(() => {
      if (isPlaying) pause();
      else play();
   }, [isPlaying, play, pause]);

   const playTrack = useCallback((id: string) => {
      setCurrentId(id);
      requestAnimationFrame(() => {
         resumeEq()
            .then(() => audioRef.current?.play())
            .then(() => setIsPlaying(true))
            .catch(() => { });
      });
   }, []);

   const pickNextId = useCallback(
      (dir: 1 | -1): string | null => {
         if (tracks.length === 0) return null;
         if (shuffle && dir === 1) {
            if (tracks.length === 1) return tracks[0].id;
            let idx = Math.floor(Math.random() * tracks.length);
            if (tracks[idx].id === currentId) idx = (idx + 1) % tracks.length;
            return tracks[idx].id;
         }
         const idx = tracks.findIndex((t) => t.id === currentId);
         const nextIdx = (idx + dir + tracks.length) % tracks.length;
         return tracks[nextIdx].id;
      },
      [tracks, currentId, shuffle]
   );

   const next = useCallback(() => {
      const id = pickNextId(1);
      if (id) playTrack(id);
   }, [pickNextId, playTrack]);

   const prev = useCallback(() => {
      const id = pickNextId(-1);
      if (id) playTrack(id);
   }, [pickNextId, playTrack]);

   const seek = useCallback((time: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = time;
      setCurrentTime(time);
   }, []);

   const changeVolume = useCallback((v: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = v;
      setVolume(v);
   }, []);

   const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

   const cycleRepeat = useCallback(() => {
      setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
   }, []);

   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const onTime = () => setCurrentTime(audio.currentTime);
      const onDur = () => setDuration(audio.duration || 0);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      const onEnded = () => {
         if (repeat === 'one') {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            return;
         }
         const isLast = tracks.length > 0 && tracks[tracks.length - 1].id === currentId;
         if (repeat === 'off' && isLast && !shuffle) {
            setIsPlaying(false);
            return;
         }
         next();
      };

      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onDur);
      audio.addEventListener('durationchange', onDur);
      audio.addEventListener('play', onPlay);
      audio.addEventListener('pause', onPause);
      audio.addEventListener('ended', onEnded);

      return () => {
         audio.removeEventListener('timeupdate', onTime);
         audio.removeEventListener('loadedmetadata', onDur);
         audio.removeEventListener('durationchange', onDur);
         audio.removeEventListener('play', onPlay);
         audio.removeEventListener('pause', onPause);
         audio.removeEventListener('ended', onEnded);
      };
   }, [next, repeat, shuffle, tracks, currentId]);

   useEffect(() => {
      if (audioRef.current) audioRef.current.volume = volume;
   }, [volume]);

   return {
      audioRef,
      currentTrack,
      currentId,
      isPlaying,
      duration,
      currentTime,
      volume,
      shuffle,
      repeat,
      coverUrl,
      play,
      pause,
      toggle,
      playTrack,
      next,
      prev,
      seek,
      changeVolume,
      toggleShuffle,
      cycleRepeat,
   };
}