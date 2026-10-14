import { useEffect, useState, useCallback } from 'react';
import {
   getAllPlaylists,
   createPlaylist as dbCreatePlaylist,
   renamePlaylist as dbRenamePlaylist,
   deletePlaylist as dbDeletePlaylist,
   LIBRARY_ID,
   type Playlist,
} from '../lib/db';

export function usePlaylists() {
   const [playlists, setPlaylists] = useState<Playlist[]>([]);
   const [currentPlaylistId, setCurrentPlaylistId] = useState<string>(LIBRARY_ID);
   const [loading, setLoading] = useState(true);

   const refresh = useCallback(async () => {
      const list = await getAllPlaylists();
      setPlaylists(list);
   }, []);

   useEffect(() => {
      refresh().finally(() => setLoading(false));
   }, [refresh]);

   const createPlaylist = useCallback(
      async (name: string) => {
         const pl = await dbCreatePlaylist(name);
         await refresh();
         setCurrentPlaylistId(pl.id);
         return pl;
      },
      [refresh]
   );

   const renamePlaylist = useCallback(
      async (id: string, name: string) => {
         await dbRenamePlaylist(id, name);
         await refresh();
      },
      [refresh]
   );

   const deletePlaylist = useCallback(
      async (id: string) => {
         await dbDeletePlaylist(id);
         await refresh();
         if (currentPlaylistId === id) setCurrentPlaylistId(LIBRARY_ID);
      },
      [refresh, currentPlaylistId]
   );

   const currentPlaylist = playlists.find((p) => p.id === currentPlaylistId) ?? null;

   return {
      playlists,
      loading,
      currentPlaylistId,
      currentPlaylist,
      setCurrentPlaylistId,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      refresh,
   };
}