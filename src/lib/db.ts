import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { parseBlob } from 'music-metadata';

export const LIBRARY_ID = 'library';

export type StoredTrack = {
   id: string;
   name: string;
   type: string;
   data: ArrayBuffer;
   addedAt: number;
   playlistId: string;
   title?: string;
   artist?: string;
   album?: string;
   duration?: number;
   coverType?: string;
   coverData?: ArrayBuffer;
   bitrate?: number;
   sampleRate?: number;
   channels?: number;
   codec?: string;
};

export type Playlist = {
   id: string;
   name: string;
   createdAt: number;
   isSystem: boolean;
};

interface MusicDB extends DBSchema {
   tracks: {
      key: string;
      value: StoredTrack;
      indexes: { 'by-addedAt': number; 'by-playlist': string };
   };
   playlists: {
      key: string;
      value: Playlist;
      indexes: { 'by-createdAt': number };
   };
}

const DB_NAME = 'music-player';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<MusicDB>> | null = null;

function getDB() {
   if (!dbPromise) {
      dbPromise = openDB<MusicDB>(DB_NAME, DB_VERSION, {
         async upgrade(db, oldVersion, _newVersion, tx) {
            if (oldVersion < 1) {
               const store = db.createObjectStore('tracks', { keyPath: 'id' });
               store.createIndex('by-addedAt', 'addedAt');
            }

            if (oldVersion < 2) {
               const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
               playlistStore.createIndex('by-createdAt', 'createdAt');

               playlistStore.put({
                  id: LIBRARY_ID,
                  name: 'Library',
                  createdAt: Date.now(),
                  isSystem: true,
               });

               const trackStore = tx.objectStore('tracks');
               trackStore.createIndex('by-playlist', 'playlistId');

               const allTracks = await trackStore.getAll();
               for (const t of allTracks) {
                  if (!t.playlistId) {
                     t.playlistId = LIBRARY_ID;
                     await trackStore.put(t);
                  }
               }
            }

            // v3: field bitrate/sampleRate/channels/codec (tidak butuh migrasi — track lama
            //      akan undefined, artinya tampil "—" sampai di-import ulang)
         },
      });
   }
   return dbPromise;
}

async function readMetadata(file: File) {
   try {
      const meta = await parseBlob(file);
      const picture = meta.common.picture?.[0];
      let coverData: ArrayBuffer | undefined;
      let coverType: string | undefined;

      if (picture) {
         const copy = new Uint8Array(picture.data.length);
         copy.set(picture.data);
         coverData = copy.buffer;
         coverType = picture.format;
      }

      return {
         title: meta.common.title,
         artist: meta.common.artist,
         album: meta.common.album,
         duration: meta.format.duration,
         coverData,
         coverType,
         bitrate: meta.format.bitrate,
         sampleRate: meta.format.sampleRate,
         channels: meta.format.numberOfChannels,
         codec: meta.format.codec,
      };
   } catch (err) {
      console.warn('[metadata] gagal parse:', file.name, err);
      return {};
   }
}

const AUDIO_EXT = /\.(mp3|flac|m4a|aac|ogg|opus|wav|wma|alac|aiff?)$/i;

function isAudioFile(file: File): boolean {
   if (file.type.startsWith('audio/')) return true;
   return AUDIO_EXT.test(file.name);
}

// ==================== TRACKS ====================

export async function addTrack(
   file: File,
   playlistId: string = LIBRARY_ID
): Promise<StoredTrack> {
   const db = await getDB();
   const data = await file.arrayBuffer();
   const meta = await readMetadata(file);

   const track: StoredTrack = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || 'audio/mpeg',
      data,
      addedAt: Date.now(),
      playlistId,
      ...meta,
   };

   await db.put('tracks', track);
   return track;
}

export async function getAllTracks(): Promise<StoredTrack[]> {
   const db = await getDB();
   return db.getAllFromIndex('tracks', 'by-addedAt');
}

export async function getTracksByPlaylist(playlistId: string): Promise<StoredTrack[]> {
   const db = await getDB();
   return db.getAllFromIndex('tracks', 'by-playlist', playlistId);
}

export async function moveTrackToPlaylist(
   trackId: string,
   playlistId: string
): Promise<void> {
   const db = await getDB();
   const track = await db.get('tracks', trackId);
   if (!track) return;
   track.playlistId = playlistId;
   await db.put('tracks', track);
}

export async function deleteTrack(id: string): Promise<void> {
   const db = await getDB();
   await db.delete('tracks', id);
}

// ==================== PLAYLISTS ====================

export async function getAllPlaylists(): Promise<Playlist[]> {
   const db = await getDB();
   const list = await db.getAllFromIndex('playlists', 'by-createdAt');
   return list.sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return a.createdAt - b.createdAt;
   });
}

function uniqueName(existing: string[], base: string): string {
   if (!existing.includes(base)) return base;
   let i = 2;
   while (existing.includes(`${base} (${i})`)) i++;
   return `${base} (${i})`;
}

export async function createPlaylist(name: string): Promise<Playlist> {
   const db = await getDB();
   const all = await db.getAll('playlists');
   const finalName = uniqueName(all.map((p) => p.name), name.trim() || 'Playlist Baru');

   const playlist: Playlist = {
      id: crypto.randomUUID(),
      name: finalName,
      createdAt: Date.now(),
      isSystem: false,
   };
   await db.put('playlists', playlist);
   return playlist;
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
   const db = await getDB();
   const playlist = await db.get('playlists', id);
   if (!playlist || playlist.isSystem) return;
   playlist.name = name.trim() || playlist.name;
   await db.put('playlists', playlist);
}

export async function deletePlaylist(id: string): Promise<void> {
   const db = await getDB();
   const playlist = await db.get('playlists', id);
   if (!playlist || playlist.isSystem) return;

   const tracks = await db.getAllFromIndex('tracks', 'by-playlist', id);
   const tx = db.transaction(['tracks', 'playlists'], 'readwrite');
   for (const t of tracks) {
      t.playlistId = LIBRARY_ID;
      await tx.objectStore('tracks').put(t);
   }
   await tx.objectStore('playlists').delete(id);
   await tx.done;
}

// ==================== IMPORT FOLDER ====================

export type FolderImportResult = {
   playlist: Playlist;
   addedCount: number;
   skippedCount: number;
};

export async function importFolder(
   files: File[],
   folderName: string,
   onProgress?: (done: number, total: number) => void
): Promise<FolderImportResult> {
   const audioFiles = files.filter(isAudioFile);

   if (audioFiles.length === 0) {
      throw new Error('Tidak ada file audio di folder ini');
   }

   const playlist = await createPlaylist(folderName);

   let addedCount = 0;
   let skippedCount = 0;

   for (let i = 0; i < audioFiles.length; i++) {
      try {
         await addTrack(audioFiles[i], playlist.id);
         addedCount++;
      } catch (err) {
         console.warn('[import] gagal tambah:', audioFiles[i].name, err);
         skippedCount++;
      }
      onProgress?.(i + 1, audioFiles.length);
   }

   return { playlist, addedCount, skippedCount };
}