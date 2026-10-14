import { useEffect, useState, useCallback } from 'react';
import {
   addTrack as dbAddTrack,
   getTracksByPlaylist,
   deleteTrack as dbDeleteTrack,
   moveTrackToPlaylist as dbMoveTrack,
   LIBRARY_ID,
   type StoredTrack,
} from '../lib/db';

export function useTracks(playlistId: string = LIBRARY_ID) {
   const [tracks, setTracks] = useState<StoredTrack[]>([]);
   const [loading, setLoading] = useState(true);

   const refresh = useCallback(async () => {
      const list = await getTracksByPlaylist(playlistId);
      setTracks(list);
   }, [playlistId]);

   useEffect(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
   }, [refresh]);

   const addTracks = useCallback(
      async (files: FileList | File[]) => {
         for (const file of Array.from(files)) {
            if (!file.type.startsWith('audio/')) continue;
            await dbAddTrack(file, playlistId);
         }
         await refresh();
      },
      [refresh, playlistId]
   );

   const removeTrack = useCallback(
      async (id: string) => {
         await dbDeleteTrack(id);
         await refresh();
      },
      [refresh]
   );

   const moveTrack = useCallback(
      async (trackId: string, targetPlaylistId: string) => {
         await dbMoveTrack(trackId, targetPlaylistId);
         await refresh();
      },
      [refresh]
   );

   return { tracks, loading, addTracks, removeTrack, moveTrack, refresh };
}