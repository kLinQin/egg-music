import {
   Play,
   Pause,
   SkipBack,
   SkipForward,
   Shuffle,
   Repeat,
   Repeat1,
   Volume2,
   VolumeX,
   Music,
   SlidersHorizontal,
} from 'lucide-react';
import { formatTime } from '../lib/audio';
import type { StoredTrack } from '../lib/db';
import type { RepeatMode } from '../hooks/usePlayer';

type Props = {
   audioRef: React.RefObject<HTMLAudioElement | null>;
   track: StoredTrack | null;
   coverUrl: string | null;
   isPlaying: boolean;
   currentTime: number;
   duration: number;
   volume: number;
   isMuted: boolean;
   shuffle: boolean;
   repeat: RepeatMode;
   onToggle: () => void;
   onPrev: () => void;
   onNext: () => void;
   onSeek: (t: number) => void;
   onVolume: (v: number) => void;
   onToggleMute: () => void;
   onToggleShuffle: () => void;
   onCycleRepeat: () => void;
   onOpenEq: () => void;
};

export function PlayerBar({
   audioRef,
   track,
   coverUrl,
   isPlaying,
   currentTime,
   duration,
   volume,
   isMuted,
   shuffle,
   repeat,
   onToggle,
   onPrev,
   onNext,
   onSeek,
   onVolume,
   onToggleMute,
   onToggleShuffle,
   onCycleRepeat,
   onOpenEq,
}: Props) {
   return (
      <footer className="player-bar">
         <div className="player-left">
            <div className="cover-small">
               {coverUrl ? (
                  <img src={coverUrl} alt="cover" />
               ) : (
                  <Music size={20} />
               )}
            </div>
            <div className="player-track-info">
               <span className="player-title">
                  {track ? track.title || track.name : 'Tidak ada lagu'}
               </span>
               {track?.artist && (
                  <span className="player-artist">{track.artist}</span>
               )}
            </div>
         </div>

         <div className="player-center">
            <div className="player-controls">
               <button
                  className={`btn icon-btn ${shuffle ? 'active' : ''}`}
                  onClick={onToggleShuffle}
                  title="Shuffle"
               >
                  <Shuffle size={18} />
               </button>
               <button className="btn icon-btn" onClick={onPrev} title="Sebelumnya">
                  <SkipBack size={20} />
               </button>
               <button
                  className="btn icon-btn play"
                  onClick={onToggle}
                  title="Play/Pause"
               >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} />}
               </button>
               <button className="btn icon-btn" onClick={onNext} title="Berikutnya">
                  <SkipForward size={20} />
               </button>
               <button
                  className={`btn icon-btn ${repeat !== 'off' ? 'active' : ''}`}
                  onClick={onCycleRepeat}
                  title={`Repeat: ${repeat}`}
               >
                  {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
               </button>
            </div>

            <div className="seek-row">
               <span className="time">{formatTime(currentTime)}</span>
               <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => onSeek(Number(e.target.value))}
               />
               <span className="time">{formatTime(duration)}</span>
            </div>
         </div>

         <div className="player-right">
            <button
               className="btn icon-btn"
               onClick={onOpenEq}
               title="Equalizer"
            >
               <SlidersHorizontal size={18} />
            </button>
            <button
               className="btn icon-btn"
               onClick={onToggleMute}
               title={isMuted ? 'Unmute' : 'Mute'}
            >
               {isMuted || volume === 0 ? (
                  <VolumeX size={18} />
               ) : (
                  <Volume2 size={18} />
               )}
            </button>
            <input
               type="range"
               min={0}
               max={1}
               step={0.01}
               value={isMuted ? 0 : volume}
               onChange={(e) => onVolume(Number(e.target.value))}
            />
         </div>

         <audio ref={audioRef} />
      </footer>
   );
}