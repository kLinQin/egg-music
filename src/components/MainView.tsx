import { useEffect, useMemo, useState } from 'react';
import { Music, ListMusic, Library } from 'lucide-react';
import type { StoredTrack, Playlist } from '../lib/db';
import { formatTime, coverToUrl } from '../lib/audio';
import { LyricsPanel } from './LyricsPanel';

type Tab = 'playlist' | 'tracks' | 'lyrics';

type Props = {
   playlist: Playlist | null;
   tracks: StoredTrack[];
   currentId: string | null;
   isPlaying: boolean;
   currentTime: number;
   onPlay: (id: string) => void;
   isMobile: boolean;
   playlists: Playlist[];
   onSelectPlaylist: (id: string) => void;
};

function getFormat(track: StoredTrack): string {
   const ext = track.name.split('.').pop()?.toUpperCase();
   if (ext) return ext;
   if (track.codec) return track.codec;
   return '—';
}

function formatBitrate(track: StoredTrack): string {
   if (!track.bitrate) return '—';
   return `${Math.round(track.bitrate / 1000)} kbps`;
}

function formatSize(bytes: number): string {
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function usePlaylistCovers(tracks: StoredTrack[]) {
   const [urls, setUrls] = useState<string[]>([]);

   const firstFourIds = useMemo(
      () => tracks.slice(0, 4).map((t) => t.id).join(','),
      [tracks]
   );

   useEffect(() => {
      const firstFour = tracks.slice(0, 4);
      const created = firstFour
         .map((t) => coverToUrl(t))
         .filter((u): u is string => u !== null);

      setUrls(created);

      return () => {
         created.forEach((u) => URL.revokeObjectURL(u));
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [firstFourIds]);

   return urls;
}

function useTrackCover(track: StoredTrack | null) {
   const [url, setUrl] = useState<string | null>(null);

   useEffect(() => {
      if (!track) {
         setUrl(null);
         return;
      }
      const u = coverToUrl(track);
      setUrl(u);
      return () => {
         if (u) URL.revokeObjectURL(u);
      };
   }, [track]);

   return url;
}

export function MainView({
   playlist,
   tracks,
   currentId,
   isPlaying,
   currentTime,
   onPlay,
   isMobile,
   playlists,
   onSelectPlaylist,
}: Props) {
   const covers = usePlaylistCovers(tracks);
   const [tab, setTab] = useState<Tab>('tracks');
   const currentTrack = tracks.find((t) => t.id === currentId) ?? null;
   const currentTrackCover = useTrackCover(currentTrack);

   const showPlaylistTab = isMobile;

   if (!playlist && !showPlaylistTab) {
      return (
         <main className="main">
            <div className="empty-state">
               <Music size={64} />
               <p>Pilih playlist</p>
            </div>
         </main>
      );
   }

   const totalDuration = tracks.reduce((sum, t) => sum + (t.duration ?? 0), 0);
   const hasCovers = covers.length > 0;

   const renderHeader = () => {
      if (!isMobile) {
         if (!playlist) return <div className="playlist-hero" />;
         return (
            <div className="playlist-hero">
               <div className={`playlist-cover ${hasCovers ? 'has-covers' : ''}`}>
                  {hasCovers ? (
                     <div className="cover-grid">
                        {[0, 1, 2, 3].map((i) => (
                           <div key={i} className="cover-cell">
                              {covers[i] ? (
                                 <img src={covers[i]} alt="" />
                              ) : (
                                 <div className="cover-empty">
                                    <Music size={24} />
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  ) : (
                     <Music size={64} />
                  )}
               </div>
               <div className="playlist-meta">
                  <span className="playlist-label">Playlist</span>
                  <h2 className="playlist-title">{playlist.name}</h2>
                  <span className="playlist-stats">
                     {tracks.length} lagu
                     {totalDuration > 0 && ` • ${formatTime(totalDuration)}`}
                  </span>
               </div>
            </div>
         );
      }

      if (tab === 'playlist') {
         return (
            <div className="playlist-hero">
               <div className="playlist-cover">
                  <ListMusic size={64} />
               </div>
               <div className="playlist-meta">
                  <span className="playlist-label">Daftar</span>
                  <h2 className="playlist-title">Playlist</h2>
                  <span className="playlist-stats">{playlists.length} playlist</span>
               </div>
            </div>
         );
      }

      if (tab === 'lyrics') {
         return (
            <div className="playlist-hero">
               <div className={`playlist-cover ${currentTrackCover ? 'has-covers' : ''}`}>
                  {currentTrackCover ? (
                     <img src={currentTrackCover} alt="" />
                  ) : (
                     <Music size={64} />
                  )}
               </div>
               <div className="playlist-meta">
                  <span className="playlist-label">Lirik</span>
                  <h2 className="playlist-title">
                     {currentTrack ? currentTrack.title || currentTrack.name : 'Pilih lagu'}
                  </h2>
                  {currentTrack?.artist && (
                     <span className="playlist-stats">{currentTrack.artist}</span>
                  )}
               </div>
            </div>
         );
      }

      if (!playlist) return <div className="playlist-hero" />;
      return (
         <div className="playlist-hero">
            <div className={`playlist-cover ${hasCovers ? 'has-covers' : ''}`}>
               {hasCovers ? (
                  <div className="cover-grid">
                     {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="cover-cell">
                           {covers[i] ? (
                              <img src={covers[i]} alt="" />
                           ) : (
                              <div className="cover-empty">
                                 <Music size={24} />
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               ) : (
                  <Music size={64} />
               )}
            </div>
            <div className="playlist-meta">
               <span className="playlist-label">Playlist</span>
               <h2 className="playlist-title">{playlist.name}</h2>
               <span className="playlist-stats">
                  {tracks.length} lagu
                  {totalDuration > 0 && ` • ${formatTime(totalDuration)}`}
               </span>
            </div>
         </div>
      );
   };

   return (
      <main className="main main-playlist">
         <div className="main-header">
            {renderHeader()}

            <div className="main-tabs">
               {showPlaylistTab && (
                  <button
                     className={`main-tab main-tab-playlist ${tab === 'playlist' ? 'active' : ''}`}
                     onClick={() => setTab('playlist')}
                  >
                     Playlist
                  </button>
               )}
               <button
                  className={`main-tab ${tab === 'tracks' ? 'active' : ''}`}
                  onClick={() => setTab('tracks')}
               >
                  Lagu
               </button>
               <button
                  className={`main-tab main-tab-lyrics ${tab === 'lyrics' ? 'active' : ''}`}
                  onClick={() => setTab('lyrics')}
               >
                  Lirik
               </button>
            </div>
         </div>

         {tab === 'playlist' && showPlaylistTab && (
            <div className="mobile-playlist-list">
               {playlists.map((pl) => {
                  const active = pl.id === playlist?.id;
                  return (
                     <div
                        key={pl.id}
                        className={`mobile-playlist-item ${active ? 'current' : ''}`}
                        onClick={() => {
                           onSelectPlaylist(pl.id);
                           setTab('tracks');
                        }}
                     >
                        <span className="playlist-icon">
                           {pl.isSystem ? <Library size={16} /> : <ListMusic size={16} />}
                        </span>
                        <span className="playlist-name">{pl.name}</span>
                     </div>
                  );
               })}
               {playlists.length === 0 && (
                  <div className="playlist-empty">Belum ada playlist</div>
               )}
            </div>
         )}

         {tab === 'tracks' && (
            <div className="playlist-tracks">
               <div className="track-row track-row-header">
                  <span className="col-index">#</span>
                  <span className="col-title">Judul</span>
                  <span className="col-album">Album</span>
                  <span className="col-format">Format</span>
                  <span className="col-bitrate">Bitrate</span>
                  <span className="col-size">Ukuran</span>
                  <span className="col-duration">Durasi</span>
               </div>

               {tracks.map((t, i) => {
                  const active = t.id === currentId;
                  const playing = active && isPlaying;
                  return (
                     <div
                        key={t.id}
                        className={`track-row ${active ? 'current' : ''}`}
                        onClick={() => onPlay(t.id)}
                     >
                        <span className="col-index">
                           {playing ? (
                              <span className="track-playing-indicator" />
                           ) : (
                              <span className="row-index">{i + 1}</span>
                           )}
                        </span>
                        <span className="col-title">
                           <span className="row-title">{t.title || t.name}</span>
                           {t.artist && <span className="row-artist">{t.artist}</span>}
                        </span>
                        <span className="col-album">{t.album || '—'}</span>
                        <span className="col-format">{getFormat(t)}</span>
                        <span className="col-bitrate">{formatBitrate(t)}</span>
                        <span className="col-size">{formatSize(t.data.byteLength)}</span>
                        <span className="col-duration">
                           {t.duration ? formatTime(t.duration) : '—'}
                        </span>
                     </div>
                  );
               })}

               {tracks.length === 0 && (
                  <div className="playlist-empty">
                     Playlist ini masih kosong. Klik "+ Tambah Lagu" untuk menambahkan.
                  </div>
               )}
            </div>
         )}

         {tab === 'lyrics' && (
            <LyricsPanel
               track={currentTrack}
               currentTime={currentTime}
               isPlaying={isPlaying}
            />
         )}
      </main>
   );
}