import './App.css';
import { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainView } from './components/MainView';
import { LyricsSidebar } from './components/LyricsSidebar';
import { PlayerBar } from './components/PlayerBar';
import { EqualizerModal } from './components/EqualizerModal';
import { useTracks } from './hooks/useTracks';
import { usePlaylists } from './hooks/usePlaylists';
import { usePlayer } from './hooks/usePlayer';
import { importFolder } from './lib/db';

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 700
  );
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 700
  );
  const [lyricsOpen, setLyricsOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 700
  );
  const [eqOpen, setEqOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  const {
    playlists,
    currentPlaylistId,
    currentPlaylist,
    setCurrentPlaylistId,
    renamePlaylist,
    deletePlaylist,
    refresh: refreshPlaylists,
  } = usePlaylists();

  const { tracks, addTracks } = useTracks(currentPlaylistId);
  const p = usePlayer(tracks);

  // Deteksi mobile
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 700;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setLyricsOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleFolderSelected = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    const first = list[0] as File & { webkitRelativePath?: string };
    const folderName =
      first.webkitRelativePath?.split('/')[0] || 'Folder Import';

    setImportProgress({ done: 0, total: list.length });
    try {
      const result = await importFolder(list, folderName, (done, total) => {
        setImportProgress({ done, total });
      });
      await refreshPlaylists();
      setCurrentPlaylistId(result.playlist.id);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setImportProgress(null);
    }
  };

  return (
    <div
      className={`app ${sidebarOpen ? '' : 'sidebar-closed'} ${lyricsOpen ? '' : 'lyrics-closed'}`}
    >
      <Header
        onAddFiles={() => fileInputRef.current?.click()}
        onAddFolder={() => folderInputRef.current?.click()}
        importProgress={importProgress}
      />

      <div className="body">
        {!isMobile && (
          <Sidebar
            open={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
            playlists={playlists}
            currentPlaylistId={currentPlaylistId}
            onSelectPlaylist={setCurrentPlaylistId}
            onRenamePlaylist={renamePlaylist}
            onDeletePlaylist={deletePlaylist}
          />
        )}

        <MainView
          playlist={currentPlaylist}
          tracks={tracks}
          currentId={p.currentId}
          isPlaying={p.isPlaying}
          currentTime={p.currentTime}
          onPlay={p.playTrack}
          isMobile={isMobile}
          playlists={playlists}
          onSelectPlaylist={setCurrentPlaylistId}
        />

        {!isMobile && (
          <LyricsSidebar
            open={lyricsOpen}
            onToggle={() => setLyricsOpen((v) => !v)}
            track={p.currentTrack}
            currentTime={p.currentTime}
            isPlaying={p.isPlaying}
          />
        )}
      </div>

      <PlayerBar
        audioRef={p.audioRef}
        track={p.currentTrack}
        coverUrl={p.coverUrl}
        isPlaying={p.isPlaying}
        currentTime={p.currentTime}
        duration={p.duration}
        volume={p.volume}
        shuffle={p.shuffle}
        repeat={p.repeat}
        onToggle={p.toggle}
        onPrev={p.prev}
        onNext={p.next}
        onSeek={p.seek}
        onVolume={p.changeVolume}
        onToggleShuffle={p.toggleShuffle}
        onCycleRepeat={p.cycleRepeat}
        onOpenEq={() => setEqOpen(true)}
      />

      <EqualizerModal open={eqOpen} onClose={() => setEqOpen(false)} />

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addTracks(e.target.files);
          e.target.value = '';
        }}
      />

      <input
        ref={folderInputRef}
        type="file"
        hidden
        multiple
        // @ts-expect-error webkitdirectory bukan properti standar
        webkitdirectory=""
        directory=""
        onChange={(e) => {
          if (e.target.files) handleFolderSelected(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default App;