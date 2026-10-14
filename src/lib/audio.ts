import type { StoredTrack } from './db';

export function trackToUrl(track: StoredTrack): string {
   const blob = new Blob([track.data], { type: track.type });
   return URL.createObjectURL(blob);
}

export function coverToUrl(track: StoredTrack): string | null {
   if (!track.coverData || !track.coverType) return null;
   const blob = new Blob([track.coverData], { type: track.coverType });
   return URL.createObjectURL(blob);
}

export function formatTime(sec: number): string {
   if (!isFinite(sec) || sec < 0) return '0:00';
   const m = Math.floor(sec / 60);
   const s = Math.floor(sec % 60);
   return `${m}:${s.toString().padStart(2, '0')}`;
}