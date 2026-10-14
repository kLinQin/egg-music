export type MediaSessionHandlers = {
   onPlay: () => void;
   onPause: () => void;
   onNext: () => void;
   onPrev: () => void;
   onSeekTo: (time: number) => void;
   onSeekBy: (offset: number) => void;
};

export function isMediaSessionSupported(): boolean {
   return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

export function updateMetadata(track: {
   title: string;
   artist?: string;
   album?: string;
   coverUrl?: string | null;
}) {
   if (!isMediaSessionSupported()) return;

   const artwork = track.coverUrl
      ? [
         { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' },
         { src: track.coverUrl, sizes: '256x256', type: 'image/jpeg' },
      ]
      : [];

   navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? '',
      album: track.album ?? '',
      artwork,
   });
}

export function updatePlaybackState(state: 'playing' | 'paused' | 'none') {
   if (!isMediaSessionSupported()) return;
   navigator.mediaSession.playbackState = state;
}

export function setupHandlers(handlers: MediaSessionHandlers) {
   if (!isMediaSessionSupported()) return;

   navigator.mediaSession.setActionHandler('play', handlers.onPlay);
   navigator.mediaSession.setActionHandler('pause', handlers.onPause);
   navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
   navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);

   try {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
         if (details.seekTime != null) handlers.onSeekTo(details.seekTime);
      });
   } catch {
      // tidak didukung
   }

   try {
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
         const offset = details.seekOffset ?? 10;
         handlers.onSeekBy(-offset);
      });
   } catch {
      // tidak didukung
   }

   try {
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
         const offset = details.seekOffset ?? 10;
         handlers.onSeekBy(offset);
      });
   } catch {
      // tidak didukung
   }
}

export function clearHandlers() {
   if (!isMediaSessionSupported()) return;
   navigator.mediaSession.setActionHandler('play', null);
   navigator.mediaSession.setActionHandler('pause', null);
   navigator.mediaSession.setActionHandler('nexttrack', null);
   navigator.mediaSession.setActionHandler('previoustrack', null);
   navigator.mediaSession.setActionHandler('seekto', null);
   navigator.mediaSession.setActionHandler('seekbackward', null);
   navigator.mediaSession.setActionHandler('seekforward', null);
}

export function updatePositionState(
   duration: number,
   position: number,
   playbackRate: number = 1
) {
   if (!isMediaSessionSupported()) return;
   if (!navigator.mediaSession.setPositionState) return;
   if (!isFinite(duration) || duration <= 0) return;

   try {
      navigator.mediaSession.setPositionState({
         duration,
         playbackRate,
         position: Math.min(position, duration),
      });
   } catch {
      // ignore
   }
}