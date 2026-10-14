import { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { StoredTrack } from '../lib/db';
import { LyricsView, type LyricsMode } from './LyricsView';

type Props = {
   open: boolean;
   onToggle: () => void;
   track: StoredTrack | null;
   currentTime: number;
   isPlaying: boolean;
};

const MODES: { value: LyricsMode; label: string }[] = [
   { value: 'plain', label: 'Plain' },
   { value: 'id', label: 'Indo' },
   { value: 'en', label: 'Inggris' },
];

export function LyricsSidebar({ open, onToggle, track, currentTime, isPlaying }: Props) {
   const [mode, setMode] = useState<LyricsMode>('plain');
   const [lyricsEnabled, setLyricsEnabled] = useState(true);

   if (!open) {
      return (
         <aside className="lyrics-sidebar lyrics-sidebar-collapsed">
            <button
               className="btn icon-btn sidebar-toggle"
               onClick={onToggle}
               title="Buka lirik"
            >
               <ChevronLeft size={18} />
            </button>
         </aside>
      );
   }

   return (
      <aside className="lyrics-sidebar">
         <div className="lyrics-sidebar-header">
            <span>Lirik</span>
            <div className="lyrics-sidebar-header-actions">
               <button
                  className={`btn icon-btn ${lyricsEnabled ? 'active' : ''}`}
                  onClick={() => setLyricsEnabled((v) => !v)}
                  title={lyricsEnabled ? 'Sembunyikan lirik' : 'Tampilkan lirik'}
               >
                  {lyricsEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
               </button>
               <button
                  className="btn icon-btn"
                  onClick={onToggle}
                  title="Tutup lirik"
               >
                  <ChevronRight size={18} />
               </button>
            </div>
         </div>

         <div className="lyrics-sidebar-modes">
            <div className="lyrics-mode-switcher">
               {MODES.map((m) => (
                  <button
                     key={m.value}
                     className={`lyrics-mode-btn ${mode === m.value ? 'active' : ''}`}
                     onClick={() => setMode(m.value)}
                  >
                     {m.label}
                  </button>
               ))}
            </div>
         </div>

         <LyricsView
            track={lyricsEnabled ? track : null}
            currentTime={currentTime}
            isPlaying={isPlaying}
            variant="sidebar"
            mode={mode}
         />
      </aside>
   );
}