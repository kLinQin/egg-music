import { useCallback, useEffect, useRef, useState } from 'react';
import type { StoredTrack } from '../lib/db';
import { trackToUrl, coverToUrl } from '../lib/audio';
import { initEq, resumeEq } from '../lib/eq';
import {
   setupHandlers,
   updateMetadata,
   updatePlaybackState,
   updatePositionState,
} from '../lib/mediaSession';

export type RepeatMode = 'off' | 'all' | 'one';

export function usePlayer(tracks: StoredTrack[]) {
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const urlRef = useRef<string | null>(null);
   const coverUrlRef = useRef<string | null>(null);
   const eqInitializedRef = useRef(false);
   const autoPlayRef = useRef(false);
   const lastVolumeRef = useRef(1);

   const [playingTrack, setPlayingTrack] = useState<StoredTrack | null>(null);
   const [isPlaying, setIsPlaying] = useState(false);
   const [duration, setDuration] = useState(0);
   const [currentTime, setCurrentTime] = useState(0);
   const [volume, setVolume] = useState(1);
   const [isMuted, setIsMuted] = useState(false);
   const [shuffle, setShuffle] = useState(false);
   const [repeat, setRepeat] = useState<RepeatMode>('off');
   const [coverUrl, setCoverUrl] = useState<string | null>(null);

   const currentId = playingTrack?.id ?? null;
   const currentTrack = playingTrack;

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

   // Load audio saat playingTrack berubah
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (!playingTrack) {
         audio.pause();
         audio.removeAttribute('src');
         if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
         }
         return;
      }

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = trackToUrl(playingTrack);

      if (!url) {
         urlRef.current = null;
         audio.pause();
         audio.removeAttribute('src');
         autoPlayRef.current = false;
         setIsPlaying(false);
         setDuration(0);
         setCurrentTime(0);
         return;
      }

      urlRef.current = url;
      audio.src = url;
      audio.load();

      if (autoPlayRef.current) {
         autoPlayRef.current = false;
         const onCanPlay = () => {
            audio.removeEventListener('canplay', onCanPlay);
            resumeEq()
               .then(() => audio.play())
               .then(() => setIsPlaying(true))
               .catch(() => { });
         };
         audio.addEventListener('canplay', onCanPlay);
      }
   }, [playingTrack]);

   // Load cover saat track berubah
   useEffect(() => {
      if (coverUrlRef.current) {
         URL.revokeObjectURL(coverUrlRef.current);
         coverUrlRef.current = null;
      }
      if (!playingTrack) {
         setCoverUrl(null);
         return;
      }
      const url = coverToUrl(playingTrack);
      coverUrlRef.current = url;
      setCoverUrl(url);
   }, [playingTrack]);

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

   const stop = useCallback(() => {
      const audio = audioRef.current;
      if (audio) {
         audio.pause();
         audio.removeAttribute('src');
         audio.load();
      }
      autoPlayRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlayingTrack(null);
   }, []);

   const toggle = useCallback(() => {
      if (isPlaying) pause();
      else play();
   }, [isPlaying, play, pause]);

   const playTrack = useCallback(
      (id: string) => {
         const audio = audioRef.current;
         const target = tracks.find((t) => t.id === id);
         if (!target) return;

         // Track tanpa audio — tidak bisa diputar
         if (!target.data || target.data.byteLength === 0) return;

         if (audio && playingTrack?.id === id) {
            audio.currentTime = 0;
            resumeEq()
               .then(() => audio.play())
               .then(() => setIsPlaying(true))
               .catch(() => { });
            return;
         }

         autoPlayRef.current = true;
         setPlayingTrack(target);
      },
      [tracks, playingTrack]
   );

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
         if (idx === -1) return tracks[0].id;
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
      if (isMuted && v > 0) {
         setIsMuted(false);
         lastVolumeRef.current = v;
      }
      if (v > 0) lastVolumeRef.current = v;
      audio.volume = v;
      setVolume(v);
   }, [isMuted]);

   const toggleMute = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isMuted) {
         const restored = lastVolumeRef.current > 0 ? lastVolumeRef.current : 1;
         audio.volume = restored;
         setVolume(restored);
         setIsMuted(false);
      } else {
         lastVolumeRef.current = volume > 0 ? volume : 1;
         audio.volume = 0;
         setVolume(0);
         setIsMuted(true);
      }
   }, [isMuted, volume]);

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
         const idx = tracks.findIndex((t) => t.id === currentId);
         if (repeat === 'off' && idx === -1) {
            setIsPlaying(false);
            return;
         }
         const isLast = idx === tracks.length - 1;
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
      if (audioRef.current) {
         audioRef.current.volume = isMuted ? 0 : volume;
      }
   }, [volume, isMuted]);

   useEffect(() => {
      setupHandlers({
         onPlay: () => {
            play();
         },
         onPause: () => {
            pause();
         },
         onNext: () => {
            next();
         },
         onPrev: () => {
            prev();
         },
         onSeekTo: (time) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = time;
            setCurrentTime(time);
         },
         onSeekBy: (offset) => {
            const audio = audioRef.current;
            if (!audio) return;
            const newTime = Math.max(
               0,
               Math.min(audio.duration || 0, audio.currentTime + offset)
            );
            audio.currentTime = newTime;
            setCurrentTime(newTime);
         },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   useEffect(() => {
      if (!currentTrack) return;
      updateMetadata({
         title: currentTrack.title || currentTrack.name,
         artist: currentTrack.artist,
         album: currentTrack.album,
         coverUrl,
      });
   }, [currentTrack, coverUrl]);

   useEffect(() => {
      updatePlaybackState(isPlaying ? 'playing' : 'paused');
   }, [isPlaying]);

   useEffect(() => {
      if (!duration) return;
      updatePositionState(duration, currentTime);
   }, [duration, currentTime]);

   return {
      audioRef,
      currentTrack,
      currentId,
      isPlaying,
      duration,
      currentTime,
      volume,
      isMuted,
      shuffle,
      repeat,
      coverUrl,
      play,
      pause,
      stop,
      toggle,
      playTrack,
      next,
      prev,
      seek,
      changeVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
   };
}