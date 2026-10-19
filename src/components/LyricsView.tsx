import { useEffect, useRef, useState } from 'react';
import { Search, X, Music, FileText, Brain, Pencil } from 'lucide-react';
import type { StoredTrack } from '../lib/db';
import { getAllPendingTracks } from '../lib/db';
import { useLyrics, type LyricsProvider } from '../hooks/useLyrics';
import {
   useTranslatedLyrics,
   type TranslateProvider,
} from '../hooks/useTranslatedLyrics';
import { searchLyrics, type LyricsSearchItem } from '../lib/lyrics';
import { formatTime } from '../lib/audio';
import { ManualLyricsModal, type PendingLyricOption } from './ManualLyricsModal';

export type LyricsMode = 'plain' | 'id' | 'en';

type Props = {
   track: StoredTrack | null;
   currentTime: number;
   isPlaying: boolean;
   variant: 'panel' | 'sidebar';
   mode: LyricsMode;
};

function GoogleIcon({ size = 16 }: { size?: number }) {
   return (
      <svg
         width={size}
         height={size}
         viewBox="0 0 48 48"
         xmlns="http://www.w3.org/2000/svg"
         aria-hidden="true"
      >
         <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
         />
         <path
            fill="#FF3D00"
            d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
         />
         <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
         />
         <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
         />
      </svg>
   );
}

export function LyricsView({ track, currentTime, isPlaying, variant, mode }: Props) {
   const {
      loading,
      result,
      error,
      provider,
      hasManual,
      setProvider,
      pickManual,
      pickManualOvh,
      saveManualText,
      deleteManualText,
   } = useLyrics(track);
   const activeLineRef = useRef<HTMLParagraphElement>(null);

   const [searchOpen, setSearchOpen] = useState(false);
   const [searchArtist, setSearchArtist] = useState('');
   const [searchTitle, setSearchTitle] = useState('');
   const [searchLoading, setSearchLoading] = useState(false);
   const [searchResults, setSearchResults] = useState<LyricsSearchItem[]>([]);
   const [translateProvider, setTranslateProvider] =
      useState<TranslateProvider>('google');
   const [popup, setPopup] = useState<'lyrics' | 'translate' | null>(null);
   const [autoPopupDismissed, setAutoPopupDismissed] = useState(false);

   const [manualModalOpen, setManualModalOpen] = useState(false);
   const [manualText, setManualText] = useState('');
   const [pendingLyrics, setPendingLyrics] = useState<PendingLyricOption[]>([]);

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

   const providerChosen = provider !== null;

   let activeIndex = -1;
   if (synced && lines.length > 0) {
      for (let i = lines.length - 1; i >= 0; i--) {
         if (currentTime >= lines[i].time) {
            activeIndex = i;
            break;
         }
      }
   }

   // Auto-buka popup sumber saat provider belum dipilih
   useEffect(() => {
      if (!track) return;
      if (providerChosen) return;
      if (autoPopupDismissed) return;
      if (popup !== null) return;
      setPopup('lyrics');
   }, [track, providerChosen, autoPopupDismissed, popup]);

   useEffect(() => {
      if (!synced || activeIndex < 0) return;
      const el = activeLineRef.current;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
   }, [activeIndex, synced]);

   // Close popup saat klik di luar
   useEffect(() => {
      if (!popup) return;
      const onClick = (e: MouseEvent) => {
         const target = e.target as HTMLElement;
         if (!target.closest('.lyrics-bottom-bar')) {
            setPopup(null);
            // Kalau belum pilih provider dan popup ditutup manual → jangan auto buka lagi
            if (!providerChosen) setAutoPopupDismissed(true);
         }
      };
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
   }, [popup, providerChosen]);

   // Reset autoPopupDismissed saat track berubah
   useEffect(() => {
      setAutoPopupDismissed(false);
   }, [track?.id]);

   const loadPendingLyrics = async () => {
      try {
         const list = await getAllPendingTracks();
         const options: PendingLyricOption[] = list
            .filter((p) => p.manualLyrics.trim().length > 0)
            .map((p) => {
               const label = p.title || p.name;
               const sub = p.artist ? ` — ${p.artist}` : '';
               return {
                  key: p.key,
                  label: `${label}${sub}`,
                  text: p.manualLyrics,
               };
            });
         setPendingLyrics(options);
      } catch (err) {
         console.warn('[lyrics] gagal load pending lirik:', err);
         setPendingLyrics([]);
      }
   };

   const buildQuery = () =>
      [searchArtist.trim(), searchTitle.trim()].filter(Boolean).join(' ');

   const openSearch = () => {
      if (!track) return;
      const title = track.title || track.name.replace(/\.[^.]+$/, '');
      const artist = track.artist || '';
      setSearchArtist(artist);
      setSearchTitle(title);
      setSearchResults([]);
      setPopup(null);
      setSearchOpen(true);
   };

   const closeSearch = () => {
      setSearchOpen(false);
      setSearchResults([]);
      setSearchLoading(false);
   };

   const submitSearch = async () => {
      const query = buildQuery();
      if (!query) return;
      setSearchLoading(true);
      try {
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

   const chooseLyricsProvider = (p: LyricsProvider) => {
      setAutoPopupDismissed(true);
      if (p === 'manual') {
         setProvider('manual');
         setPopup(null);
         if (!hasManual) {
            setManualText('');
            loadPendingLyrics();
            setManualModalOpen(true);
         }
         return;
      }
      setProvider(p);
      setPopup(null);
   };

   const chooseTranslateProvider = (p: TranslateProvider) => {
      setTranslateProvider(p);
      setPopup(null);
   };

   const openManualModal = () => {
      setProvider('manual');
      setManualText(result?.plain ?? lines.map((l) => l.text).join('\n'));
      loadPendingLyrics();
      setManualModalOpen(true);
      setSearchOpen(false);
      setPopup(null);
   };

   const submitManual = async () => {
      if (!manualText.trim()) return;
      await saveManualText(manualText);
      setManualModalOpen(false);
   };

   const removeManual = async () => {
      await deleteManualText();
      setManualModalOpen(false);
      setManualText('');
   };

   const searchLinks = [
      { label: 'Lyricsify', url: 'https://www.lyricsify.com/' },
      { label: 'LRCLIB', url: 'https://lrclib.net/' },
   ];

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

         {track && !providerChosen && (
            <div className="lyrics-view-placeholder">
               Pilih sumber lirik terlebih dahulu
            </div>
         )}

         {track && providerChosen && !loading && !result && (
            <div className="lyrics-view-placeholder">
               {error || (provider === 'manual' ? 'Belum ada lirik manual untuk lagu ini' : 'Lirik tidak tersedia')}
            </div>
         )}

         {track && providerChosen && !loading && result && (
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

         {!isPlaying && synced && activeIndex < 0 && track && providerChosen && !loading && result && !translation.error && (
            <div className="lyrics-hint">Tekan play untuk sinkronisasi</div>
         )}
      </>
   );

   const overlay = showOverlay && track && providerChosen ? (
      <div className="lyrics-overlay">
         <div className="lyrics-overlay-spinner" />
         <div className="lyrics-overlay-text">{overlayText}</div>
      </div>
   ) : null;

   const searchBar = track && (
      <div className="lyrics-bottom-bar">
         {!searchOpen ? (
            <>
               {popup === 'lyrics' && (
                  <div className="lyrics-popup">
                     <button
                        className={`lyrics-popup-item ${provider === 'lrclib' ? 'active' : ''}`}
                        onClick={() => chooseLyricsProvider('lrclib')}
                     >
                        <Music size={16} />
                        <span>LRCLIB</span>
                     </button>
                     <button
                        className={`lyrics-popup-item ${provider === 'lyricsovh' ? 'active' : ''}`}
                        onClick={() => chooseLyricsProvider('lyricsovh')}
                     >
                        <FileText size={16} />
                        <span>lyrics.ovh</span>
                     </button>
                     <button
                        className={`lyrics-popup-item ${provider === 'manual' ? 'active' : ''}`}
                        onClick={() => chooseLyricsProvider('manual')}
                     >
                        <Pencil size={16} />
                        <span>Manual</span>
                     </button>
                  </div>
               )}

               {popup === 'translate' && showTranslation && (
                  <div className="lyrics-popup">
                     <button
                        className={`lyrics-popup-item ${translateProvider === 'google' ? 'active' : ''}`}
                        onClick={() => chooseTranslateProvider('google')}
                     >
                        <GoogleIcon size={16} />
                        <span>Google</span>
                     </button>
                     <button
                        className={`lyrics-popup-item ${translateProvider === 'mymemory' ? 'active' : ''}`}
                        onClick={() => chooseTranslateProvider('mymemory')}
                     >
                        <Brain size={16} />
                        <span>MyMemory</span>
                     </button>
                  </div>
               )}

               <div className="lyrics-bottom-bar-inner">
                  <button
                     className={`lyrics-bottom-btn lyrics-bottom-btn--left ${popup === 'lyrics' ? 'open' : ''}`}
                     onClick={() => setPopup((p) => (p === 'lyrics' ? null : 'lyrics'))}
                     title="Sumber lirik"
                     disabled={loading}
                  >
                     {loading ? (
                        <>
                           <span className="lyrics-btn-spinner" />
                           <span className="lyrics-btn-label">Memuat...</span>
                        </>
                     ) : !providerChosen ? (
                        <>
                           <Music size={14} />
                           <span className="lyrics-btn-label">Pilih sumber</span>
                        </>
                     ) : (
                        <>
                           {provider === 'lrclib' ? (
                              <Music size={14} />
                           ) : provider === 'lyricsovh' ? (
                              <FileText size={14} />
                           ) : (
                              <Pencil size={14} />
                           )}
                           <span className="lyrics-btn-label">
                              {provider === 'lrclib'
                                 ? 'LRCLIB'
                                 : provider === 'lyricsovh'
                                    ? 'lyrics.ovh'
                                    : 'Manual'}
                           </span>
                        </>
                     )}
                  </button>

                  <button
                     className={`lyrics-bottom-btn lyrics-bottom-btn--middle ${popup === 'translate' ? 'open' : ''}`}
                     onClick={() => showTranslation && setPopup((p) => (p === 'translate' ? null : 'translate'))}
                     disabled={!showTranslation || translating || !providerChosen}
                     title="Sumber terjemahan"
                  >
                     {translating ? (
                        <>
                           <span className="lyrics-btn-spinner" />
                           <span className="lyrics-btn-label">{translation.progress}%</span>
                        </>
                     ) : (
                        <>
                           {translateProvider === 'google' ? (
                              <GoogleIcon size={14} />
                           ) : (
                              <Brain size={14} />
                           )}
                           <span className="lyrics-btn-label">
                              {translateProvider === 'google' ? 'Google' : 'MyMemory'}
                           </span>
                        </>
                     )}
                  </button>

                  {provider === 'manual' ? (
                     <button
                        className="lyrics-bottom-btn lyrics-bottom-btn--right"
                        onClick={openManualModal}
                        title="Edit lirik manual"
                     >
                        <Pencil size={16} />
                     </button>
                  ) : (
                     <button
                        className="lyrics-bottom-btn lyrics-bottom-btn--right"
                        onClick={openSearch}
                        title="Cari lirik manual"
                        disabled={!providerChosen}
                     >
                        <Search size={16} />
                     </button>
                  )}
               </div>
            </>
         ) : (
            <div className="lyrics-search-panel">
               <div className="lyrics-search-inputs">
                  <input
                     className="lyrics-search-input"
                     placeholder="Artist..."
                     value={searchArtist}
                     autoFocus
                     onChange={(e) => setSearchArtist(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter') submitSearch();
                        if (e.key === 'Escape') closeSearch();
                     }}
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
               </div>
               <div className="lyrics-search-actions">
                  <button
                     className="lyrics-search-provider-btn"
                     onClick={submitSearch}
                     disabled={searchLoading || !buildQuery()}
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
                     className="lyrics-search-provider-btn lyrics-search-close-btn"
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

   const manualModal = (
      <ManualLyricsModal
         open={manualModalOpen}
         initialText={manualText}
         hasManual={hasManual}
         searchLinks={searchLinks}
         pendingLyrics={pendingLyrics}
         onChange={setManualText}
         onSave={submitManual}
         onDelete={removeManual}
         onClose={() => setManualModalOpen(false)}
      />
   );

   if (variant === 'sidebar') {
      return (
         <div className="lyrics-sidebar-view">
            <div className="lyrics-sidebar-body">
               <div className="lyrics-scroll">{body}</div>
            </div>
            {overlay}
            {searchBar}
            {manualModal}
         </div>
      );
   }

   return (
      <div className="lyrics-panel">
         <div className="lyrics-scroll">{body}</div>
         {overlay}
         {searchBar}
         {manualModal}
      </div>
   );
}