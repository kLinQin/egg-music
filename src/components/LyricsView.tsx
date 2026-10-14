import { useEffect, useRef } from 'react';
import type { StoredTrack } from '../lib/db';
import { useLyrics } from '../hooks/useLyrics';
import { useTranslatedLyrics } from '../hooks/useTranslatedLyrics';

export type LyricsMode = 'plain' | 'id' | 'en';

type Props = {
   track: StoredTrack | null;
   currentTime: number;
   isPlaying: boolean;
   variant: 'panel' | 'sidebar';
   mode: LyricsMode;
};

export function LyricsView({ track, currentTime, isPlaying, variant, mode }: Props) {
   const { loading, result, error } = useLyrics(track);
   const activeLineRef = useRef<HTMLParagraphElement>(null);

   const lines = result?.lines ?? [];
   const synced = result?.synced ?? false;

   const showTranslation = mode !== 'plain';
   const targetLang = mode === 'en' ? 'en' : 'id';

   const translation = useTranslatedLyrics(lines, targetLang, showTranslation);

   let activeIndex = -1;
   if (synced && lines.length > 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
         if (currentTime >= lines[i].time) {
            activeIndex = i;
            break;
         }
      }
   }

   useEffect(() => {
      if (!synced || activeIndex < 0) return;
      const el = activeLineRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
   }, [activeIndex, synced]);

   const content = (
      <>
         {!track && (
            <div className="lyrics-view-placeholder">
               Pilih lagu untuk melihat lirik
            </div>
         )}

         {track && loading && (
            <div className="lyrics-view-placeholder">Memuat lirik...</div>
         )}

         {track && !loading && (error || !result) && (
            <div className="lyrics-view-placeholder">
               {error || 'Lirik tidak tersedia'}
            </div>
         )}

         {track && !loading && result && (
            <div className={`lyrics-content ${synced ? 'synced' : 'plain'}`}>
               {lines.map((line, i) => {
                  const isActive = synced && i === activeIndex;
                  const translated = translation.translations[i];
                  return (
                     <div
                        key={i}
                        ref={isActive ? (activeLineRef as unknown as React.RefObject<HTMLDivElement>) : null}
                        className={`lyric-line-wrapper ${isActive ? 'active' : ''}`}
                     >
                        <p className={`lyric-line ${isActive ? 'active' : ''}`}>
                           {line.text}
                        </p>
                        {showTranslation && translated && (
                           <p className="lyric-line-translated">{translated}</p>
                        )}
                     </div>
                  );
               })}
            </div>
         )}

         {!isPlaying && synced && activeIndex < 0 && track && !loading && result && (
            <div className="lyrics-hint">Tekan play untuk sinkronisasi</div>
         )}
      </>
   );

   if (variant === 'sidebar') {
      return <div className="lyrics-sidebar-body">{content}</div>;
   }

   return <div className="lyrics-panel">{content}</div>;
}