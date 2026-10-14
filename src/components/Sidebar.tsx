import { useState } from 'react';
import {
   Trash2,
   ListMusic,
   Library,
   ChevronLeft,
   ChevronRight,
   Pencil,
} from 'lucide-react';
import type { Playlist } from '../lib/db';

type Props = {
   open: boolean;
   onToggle: () => void;

   playlists: Playlist[];
   currentPlaylistId: string;
   onSelectPlaylist: (id: string) => void;
   onRenamePlaylist: (id: string, name: string) => void;
   onDeletePlaylist: (id: string) => void;
};

export function Sidebar({
   open,
   onToggle,
   playlists,
   currentPlaylistId,
   onSelectPlaylist,
   onRenamePlaylist,
   onDeletePlaylist,
}: Props) {
   const [editingId, setEditingId] = useState<string | null>(null);
   const [editName, setEditName] = useState('');

   if (!open) {
      return (
         <aside className="sidebar sidebar-collapsed">
            <button
               className="btn icon-btn sidebar-toggle"
               onClick={onToggle}
               title="Buka sidebar"
            >
               <ChevronRight size={18} />
            </button>
         </aside>
      );
   }

   const submitRename = (id: string) => {
      if (editName.trim()) onRenamePlaylist(id, editName);
      setEditingId(null);
      setEditName('');
   };

   return (
      <aside className="sidebar">
         <div className="sidebar-header">
            <span>Playlist</span>
            <div className="sidebar-header-actions">
               <button
                  className="btn icon-btn"
                  onClick={onToggle}
                  title="Tutup sidebar"
               >
                  <ChevronLeft size={18} />
               </button>
            </div>
         </div>

         <ul className="playlist-list">
            {playlists.map((pl) => {
               const active = pl.id === currentPlaylistId;
               const isEditing = editingId === pl.id;
               return (
                  <li
                     key={pl.id}
                     className={`playlist-item ${active ? 'current' : ''}`}
                     onClick={() => onSelectPlaylist(pl.id)}
                  >
                     <span className="playlist-icon">
                        {pl.isSystem ? <Library size={16} /> : <ListMusic size={16} />}
                     </span>

                     {isEditing ? (
                        <input
                           autoFocus
                           className="playlist-input inline"
                           value={editName}
                           onClick={(e) => e.stopPropagation()}
                           onChange={(e) => setEditName(e.target.value)}
                           onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(pl.id);
                              if (e.key === 'Escape') setEditingId(null);
                           }}
                           onBlur={() => submitRename(pl.id)}
                        />
                     ) : (
                        <span className="playlist-name">{pl.name}</span>
                     )}

                     {!pl.isSystem && !isEditing && (
                        <div className="playlist-actions">
                           <button
                              className="btn icon-sm"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setEditingId(pl.id);
                                 setEditName(pl.name);
                              }}
                              title="Rename"
                           >
                              <Pencil size={12} />
                           </button>
                           <button
                              className="btn icon-sm"
                              onClick={(e) => {
                                 e.stopPropagation();
                                 if (confirm(`Hapus playlist "${pl.name}"? Lagu akan dipindah ke Library.`)) {
                                    onDeletePlaylist(pl.id);
                                 }
                              }}
                              title="Hapus"
                           >
                              <Trash2 size={12} />
                           </button>
                        </div>
                     )}
                  </li>
               );
            })}
         </ul>
      </aside>
   );
}