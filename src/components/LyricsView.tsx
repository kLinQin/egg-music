import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { StoredTrack } from '../lib/db';
import { useLyrics } from '../hooks/useLyrics';
import {
   useTranslatedLyrics,
   type TranslateProvider,
} from '../hooks/useTranslatedLyrics';
import { searchLyrics, type LyricsSearchItem } from '../lib/lyrics';
import { formatTime } from '../lib/audio';

export type LyricsMode = 'plain' | 'id' | 'en';

type Props = {
   track: StoredTrack | null;
   currentTime: number;
   isPlaying: boolean;
   variant: 'panel' | 'sidebar';
   mode: LyricsMode;
};

export function LyricsView({ track, currentTime, isPlaying, variant, mode }: Props) {
   const {
      loading,
      result,
      error,
      manual,
      provider,
      setProvider,
      pickManual,
      pickManualOvh,
      resetToAuto,
   } = useLyrics(track);
   const activeLineRef = useRef<HTMLParagraphElement>(null);

   const [searchOpen, setSearchOpen] = useState(false);
   const [searchArtist, setSearchArtist] = useState('');
   const [searchTitle, setSearchTitle] = useState('');
   const [searchLoading, setSearchLoading] = useState(false);
   const [searchResults, setSearchResults] = useState<LyricsSearchItem[]>([]);
   const [translateProvider, setTranslateProvider] =
      useState<TranslateProvider>('google');

   const lines = result?.lines ?? [];
   const synced = result?.synced ?? false;

   const showTranslation = mode !== 'plain';
   const targetLang = mode === 'en' ? 'en' : 'id';

   const translation = useTranslatedLyrics(
      lines,
      targetLang,
      showTranslation,
      translateProvider
   );

   const translating = showTranslation && translation.loading;
   const showOverlay = loading || translating;
   const overlayText = loading
      ? 'Memuat lirik...'
      : `Menerjemahkan... ${translation.progress}%`;

   const translationError =
      showTranslation && !translation.loading && translation.error;

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

   const openSearch = () => {
      if (!track) return;
      const title = track.title || track.name.replace(/\.[^.]+$/, '');
      const artist = track.artist || '';
      setSearchArtist(artist);
      setSearchTitle(title);
      setSearchResults([]);
      setSearchOpen(true);
   };

   const closeSearch = () => {
      setSearchOpen(false);
      setSearchResults([]);
      setSearchLoading(false);
   };

   const submitSearch = async () => {
      if (!searchTitle.trim()) return;
      setSearchLoading(true);
      try {
         const query = `${searchTitle} ${searchArtist}`.trim();
         const res = await searchLyrics(query);
         setSearchResults(res);
      } catch (err) {
         console.warn('[lyrics] search gagal:', err);
         setSearchResults([]);
      } finally {
         setSearchLoading(false);
      }
   };

   const chooseResult = (item: LyricsSearchItem) => {
      pickManual({
         id: item.id,
         trackName: item.trackName,
         artistName: item.artistName,
      });
      closeSearch();
   };

   const submitOvh = async () => {
      if (!searchArtist.trim() || !searchTitle.trim()) return;
      pickManualOvh(searchArtist.trim(), searchTitle.trim());
      closeSearch();
   };

   const body = (
      <>
         {translationError && (
            <div className="lyrics-error-banner">{translation.error}</div>
         )}

         {!track && (
            <div className="lyrics-view-placeholder">
               Pilih lagu untuk melihat lirik
            </div>
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

         {!isPlaying && synced && activeIndex < 0 && track && !loading && result && !translation.error && (
            <div className="lyrics-hint">Tekan play untuk sinkronisasi</div>
         )}
      </>
   );

   const overlay = showOverlay && track ? (
      <div className="lyrics-overlay">
         <div className="lyrics-overlay-spinner" />
         <div className="lyrics-overlay-text">{overlayText}</div>
      </div>
   ) : null;

   const searchBar = track && (
      <div className="lyrics-search-bar">
         {!searchOpen ? (
            <>
               <button
                  className={`lyrics-provider-btn ${provider === 'lrclib' ? 'active' : ''}`}
                  onClick={() => setProvider('lrclib')}
                  title="Sumber lirik: LRCLIB"
               >
                  LRCLIB
               </button>
               <button
                  className={`lyrics-provider-btn ${provider === 'lyricsovh' ? 'active' : ''}`}
                  onClick={() => setProvider('lyricsovh')}
                  title="Sumber lirik: lyrics.ovh"
               >
                  lyrics.ovh
               </button>

               {showTranslation && (
                  <>
                     <span className="lyrics-toolbar-divider" />
                     <button
                        className={`lyrics-provider-btn ${translateProvider === 'google' ? 'active' : ''}`}
                        onClick={() => setTranslateProvider('google')}
                        title="Terjemahan: Google"
                     >
                        Google
                     </button>
                     <button
                        className={`lyrics-provider-btn ${translateProvider === 'mymemory' ? 'active' : ''}`}
                        onClick={() => setTranslateProvider('mymemory')}
                        title="Terjemahan: MyMemory"
                     >
                        MyMemory
                     </button>
                  </>
               )}

               <button
                  className="btn icon-btn"
                  onClick={openSearch}
                  title="Cari lirik manual"
               >
                  <Search size={14} />
               </button>
               {manual && (
                  <button
                     className="btn icon-btn"
                     onClick={resetToAuto}
                     title="Kembali ke auto search"
                  >
                     <X size={14} />
                  </button>
               )}
            </>
         ) : (
            <div className="lyrics-search-panel">
               <input
                  className="lyrics-search-input"
                  placeholder="Nama artist..."
                  value={searchArtist}
                  autoFocus
                  onChange={(e) => setSearchArtist(e.target.value)}
               />
               <input
                  className="lyrics-search-input"
                  placeholder="Judul lagu..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === 'Enter') submitSearch();
                     if (e.key === 'Escape') closeSearch();
                  }}
               />
               <div className="lyrics-search-actions">
                  <button
                     className="lyrics-search-provider-btn"
                     onClick={submitSearch}
                     disabled={searchLoading || !searchTitle.trim()}
                  >
                     {searchLoading ? '...' : 'LRCLIB'}
                  </button>
                  <button
                     className="lyrics-search-provider-btn"
                     onClick={submitOvh}
                     disabled={!searchArtist.trim() || !searchTitle.trim()}
                  >
                     lyrics.ovh
                  </button>
                  <button
                     className="btn icon-btn"
                     onClick={closeSearch}
                     title="Tutup"
                  >
                     <X size={14} />
                  </button>
               </div>
               {(searchLoading || searchResults.length > 0) && (
                  <div className="lyrics-search-results">
                     {searchLoading && (
                        <div className="lyrics-search-loading">Mencari...</div>
                     )}
                     {!searchLoading && searchResults.length === 0 && (
                        <div className="lyrics-search-loading">Tidak ada hasil</div>
                     )}
                     {searchResults.map((item) => (
                        <button
                           key={item.id}
                           className="lyrics-search-item"
                           onClick={() => chooseResult(item)}
                        >
                           <span className="lyrics-search-item-title">
                              {item.trackName}
                           </span>
                           <span className="lyrics-search-item-sub">
                              {item.artistName}
                              {item.albumName && ` • ${item.albumName}`}
                              {item.duration > 0 && ` • ${formatTime(item.duration)}`}
                           </span>
                           <span className="lyrics-search-item-tags">
                              {item.hasSynced && <span className="tag-sync">SYNC</span>}
                              {item.hasPlain && !item.hasSynced && (
                                 <span className="tag-plain">PLAIN</span>
                              )}
                           </span>
                        </button>
                     ))}
                  </div>
               )}
            </div>
         )}
      </div>
   );

   if (variant === 'sidebar') {
      return (
         <div className="lyrics-sidebar-view">
            <div className="lyrics-sidebar-body">
               <div className="lyrics-scroll">{body}</div>
            </div>
            {overlay}
            {searchBar}
         </div>
      );
   }

   return (
      <div className="lyrics-panel">
         <div className="lyrics-scroll">{body}</div>
         {overlay}
         {searchBar}
      </div>
   );
}