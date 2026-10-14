import { useState } from 'react';
import type { StoredTrack } from '../lib/db';
import { LyricsView, type LyricsMode } from './LyricsView';

type Props = {
   track: StoredTrack | null;
   currentTime: number;
   isPlaying: boolean;
};

const MODES: { value: LyricsMode; label: string }[] = [
   { value: 'plain', label: 'Plain' },
   { value: 'id', label: 'Indo' },
   { value: 'en', label: 'Inggris' },
];

export function LyricsPanel({ track, currentTime, isPlaying }: Props) {
   const [mode, setMode] = useState<LyricsMode>('plain');

   return (
      <div className="lyrics-panel-wrapper">
         <div className="lyrics-panel-header">
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
            track={track}
            currentTime={currentTime}
            isPlaying={isPlaying}
            variant="panel"
            mode={mode}
         />
      </div>
   );
}