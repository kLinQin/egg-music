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

export type ManualLyrics = {
   trackId: string;
   text: string;
   updatedAt: number;
};

export type PendingTrack = {
   key: string;
   name: string;
   title: string;
   artist: string;
   album: string;
   duration: number;
   playlistName: string;
   manualLyrics: string;
   updatedAt: number;
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
   manualLyrics: {
      key: string;
      value: ManualLyrics;
   };
   pendingTracks: {
      key: string;
      value: PendingTrack;
   };
}

const DB_NAME = 'music-player';
const DB_VERSION = 5;

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

            if (oldVersion < 4) {
               db.createObjectStore('manualLyrics', { keyPath: 'trackId' });
            }

            if (oldVersion < 5) {
               db.createObjectStore('pendingTracks', { keyPath: 'key' });
            }
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

// ==================== MANUAL LYRICS ====================

export async function getManualLyrics(trackId: string): Promise<ManualLyrics | null> {
   const db = await getDB();
   const entry = await db.get('manualLyrics', trackId);
   return entry ?? null;
}

export async function setManualLyrics(trackId: string, text: string): Promise<void> {
   const db = await getDB();
   await db.put('manualLyrics', {
      trackId,
      text,
      updatedAt: Date.now(),
   });
}

export async function deleteManualLyrics(trackId: string): Promise<void> {
   const db = await getDB();
   await db.delete('manualLyrics', trackId);
}

// ==================== PENDING TRACKS ====================

export function pendingKey(name: string, title: string, artist: string): string {
   return `${name.trim()}|${title.trim()}|${artist.trim()}`;
}

export async function getAllPendingTracks(): Promise<PendingTrack[]> {
   const db = await getDB();
   const list = await db.getAll('pendingTracks');
   return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addPendingTrack(track: PendingTrack): Promise<void> {
   const db = await getDB();
   await db.put('pendingTracks', track);
}

export async function deletePendingTrack(key: string): Promise<void> {
   const db = await getDB();
   await db.delete('pendingTracks', key);
}

export async function clearPendingTracks(): Promise<void> {
   const db = await getDB();
   await db.clear('pendingTracks');
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

// ==================== RESET ====================

export async function resetAllData(): Promise<void> {
   const db = await getDB();
   const tx = db.transaction(
      ['tracks', 'playlists', 'manualLyrics', 'pendingTracks'],
      'readwrite'
   );
   await tx.objectStore('tracks').clear();
   await tx.objectStore('playlists').clear();
   await tx.objectStore('manualLyrics').clear();
   await tx.objectStore('pendingTracks').clear();
   await tx.done;
   await db.put('playlists', {
      id: LIBRARY_ID,
      name: 'Library',
      createdAt: Date.now(),
      isSystem: true,
   });
}

// ==================== BACKUP / RESTORE ====================

export type BackupSettings = {
   eq?: { presetIndex: number | null; gains: number[] | null };
   lyricsProvider?: string | null;
};

export type BackupPlaylist = {
   name: string;
   createdAt: number;
};

export type BackupPendingTrack = {
   name: string;
   title: string;
   artist: string;
   album: string;
   duration: number;
   playlistName: string;
   manualLyrics: string;
};

export type BackupFile = {
   version: 1 | 2 | 3;
   exportedAt: string;
   settings?: BackupSettings;
   playlists?: BackupPlaylist[];
   tracks?: unknown[];
   manualLyrics?: unknown[];
   eq?: { presetIndex: number | null; gains: number[] | null };
   lyricsPrefs?: { provider: string | null; choices: unknown[] };
   pendingTracks?: BackupPendingTrack[];
};

const LS_PROVIDER = 'lyrics-provider';
const LS_EQ_PRESET_INDEX = 'eq-preset-index';
const LS_EQ_GAINS = 'eq-gains';

function readLocalJson<T>(key: string): T | null {
   try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
   } catch {
      return null;
   }
}

function writeLocal(key: string, value: unknown): void {
   try {
      localStorage.setItem(
         key,
         typeof value === 'string' ? value : JSON.stringify(value)
      );
   } catch {
      // ignore
   }
}

function readEqState(): { presetIndex: number | null; gains: number[] | null } {
   const presetRaw = localStorage.getItem(LS_EQ_PRESET_INDEX);
   let presetIndex: number | null = null;
   if (presetRaw !== null) {
      const n = Number(presetRaw);
      if (Number.isInteger(n)) presetIndex = n;
   }
   const gains = readLocalJson<number[]>(LS_EQ_GAINS);
   return {
      presetIndex,
      gains: Array.isArray(gains) ? gains : null,
   };
}

function readLyricsProvider(): string | null {
   try {
      return localStorage.getItem(LS_PROVIDER);
   } catch {
      return null;
   }
}

export async function exportData(): Promise<BackupFile> {
   const db = await getDB();
   const playlists = await db.getAll('playlists');
   const tracks = await db.getAll('tracks');
   const manualLyrics = await db.getAll('manualLyrics');
   const pendingTracksRaw = await db.getAll('pendingTracks');

   const playlistNameById = new Map<string, string>();
   for (const p of playlists) playlistNameById.set(p.id, p.name);

   const lyricsByTrackId = new Map<string, string>();
   for (const ml of manualLyrics) lyricsByTrackId.set(ml.trackId, ml.text);

   const pendingMap = new Map<string, BackupPendingTrack>();
   for (const pt of pendingTracksRaw) {
      pendingMap.set(pt.key, {
         name: pt.name,
         title: pt.title,
         artist: pt.artist,
         album: pt.album,
         duration: pt.duration,
         playlistName: pt.playlistName,
         manualLyrics: pt.manualLyrics,
      });
   }

   for (const t of tracks) {
      const name = t.name;
      const title = t.title ?? '';
      const artist = t.artist ?? '';
      const key = pendingKey(name, title, artist);
      if (pendingMap.has(key)) continue;
      pendingMap.set(key, {
         name,
         title,
         artist,
         album: t.album ?? '',
         duration: t.duration ?? 0,
         playlistName: playlistNameById.get(t.playlistId) ?? 'Library',
         manualLyrics: lyricsByTrackId.get(t.id) ?? '',
      });
   }

   const pendingTracks = Array.from(pendingMap.values());

   const backupPlaylists: BackupPlaylist[] = playlists
      .filter((p) => !p.isSystem)
      .map((p) => ({ name: p.name, createdAt: p.createdAt }));

   return {
      version: 3,
      exportedAt: new Date().toISOString(),
      settings: {
         eq: readEqState(),
         lyricsProvider: readLyricsProvider(),
      },
      playlists: backupPlaylists,
      pendingTracks,
   };
}

export type ImportResult = {
   addedPlaylists: number;
   skippedPlaylists: number;
   addedPendingTracks: number;
   skippedPendingTracks: number;
   restoredEq: boolean;
   restoredLyricsPrefs: boolean;
   legacyIgnored: boolean;
};

function isValidBackup(obj: unknown): obj is BackupFile {
   if (!obj || typeof obj !== 'object') return false;
   const o = obj as Record<string, unknown>;
   if (o.version !== 1 && o.version !== 2 && o.version !== 3) return false;
   return true;
}

function restoreEqState(
   eq: { presetIndex: number | null; gains: number[] | null } | undefined
): boolean {
   if (!eq) return false;
   let restored = false;
   if (eq.presetIndex !== null && Number.isInteger(eq.presetIndex)) {
      writeLocal(LS_EQ_PRESET_INDEX, String(eq.presetIndex));
      restored = true;
   }
   if (Array.isArray(eq.gains) && eq.gains.every((v) => typeof v === 'number')) {
      writeLocal(LS_EQ_GAINS, JSON.stringify(eq.gains));
      restored = true;
   }
   return restored;
}

function restoreLyricsProvider(provider: string | null | undefined): boolean {
   if (typeof provider !== 'string') return false;
   writeLocal(LS_PROVIDER, provider);
   return true;
}

export async function importData(raw: unknown): Promise<ImportResult> {
   if (!isValidBackup(raw)) {
      throw new Error('File backup tidak valid.');
   }

   const db = await getDB();

   const existingPlaylists = await db.getAll('playlists');
   const existingPlaylistNames = new Set(
      existingPlaylists.map((p) => p.name.toLowerCase())
   );

   const existingPendingKeys = new Set(
      (await db.getAllKeys('pendingTracks')) as string[]
   );

   let addedPlaylists = 0;
   let skippedPlaylists = 0;
   let addedPendingTracks = 0;
   let skippedPendingTracks = 0;

   const playlistSource: BackupPlaylist[] = Array.isArray(raw.playlists)
      ? raw.playlists
         .filter(
            (p): p is BackupPlaylist =>
               !!p && typeof p.name === 'string' && p.name.trim().length > 0
         )
         .map((p) => ({
            name: p.name,
            createdAt:
               typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
         }))
      : [];

   const tx = db.transaction(['playlists', 'pendingTracks'], 'readwrite');
   const playlistStore = tx.objectStore('playlists');
   const pendingStore = tx.objectStore('pendingTracks');

   for (const pl of playlistSource) {
      const lower = pl.name.toLowerCase();
      if (lower === 'library' || existingPlaylistNames.has(lower)) {
         skippedPlaylists++;
         continue;
      }
      const newPlaylist: Playlist = {
         id: crypto.randomUUID(),
         name: pl.name,
         createdAt: pl.createdAt,
         isSystem: false,
      };
      await playlistStore.put(newPlaylist);
      existingPlaylistNames.add(lower);
      addedPlaylists++;
   }

   if (Array.isArray(raw.pendingTracks)) {
      for (const pt of raw.pendingTracks) {
         if (!pt || typeof pt.name !== 'string') {
            skippedPendingTracks++;
            continue;
         }
         const name = pt.name.trim();
         const title = typeof pt.title === 'string' ? pt.title.trim() : '';
         const artist = typeof pt.artist === 'string' ? pt.artist.trim() : '';
         if (!name) {
            skippedPendingTracks++;
            continue;
         }
         const key = pendingKey(name, title, artist);
         if (existingPendingKeys.has(key)) {
            skippedPendingTracks++;
            continue;
         }
         const pending: PendingTrack = {
            key,
            name,
            title,
            artist,
            album: typeof pt.album === 'string' ? pt.album : '',
            duration: typeof pt.duration === 'number' ? pt.duration : 0,
            playlistName:
               typeof pt.playlistName === 'string' ? pt.playlistName : 'Library',
            manualLyrics:
               typeof pt.manualLyrics === 'string' ? pt.manualLyrics : '',
            updatedAt: Date.now(),
         };
         await pendingStore.put(pending);
         existingPendingKeys.add(key);
         addedPendingTracks++;
      }
   }

   await tx.done;

   const eqSource = raw.settings?.eq ?? raw.eq;
   const providerSource =
      raw.settings?.lyricsProvider ?? raw.lyricsPrefs?.provider ?? null;

   const restoredEq = restoreEqState(eqSource);
   const restoredLyricsPrefs = restoreLyricsProvider(providerSource);

   const legacyIgnored = raw.version !== 3;

   return {
      addedPlaylists,
      skippedPlaylists,
      addedPendingTracks,
      skippedPendingTracks,
      restoredEq,
      restoredLyricsPrefs,
      legacyIgnored,
   };
}