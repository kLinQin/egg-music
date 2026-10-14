# Egg Music

Music player lokal berbasis web. Semua file audio disimpan di browser (IndexedDB), diputar tanpa upload ke server. Dilengkapi lirik otomatis, terjemahan lirik, dan equalizer 8-band.

Repo: https://github.com/kLinQin/egg-music

---

## Daftar Isi

- [Fitur](#fitur)
- [Tech Stack](#tech-stack)
- [Arsitektur](#arsitektur)
- [Struktur Folder](#struktur-folder)
- [Cara Install](#cara-install)
- [Cara Pakai](#cara-pakai)
- [API Eksternal](#api-eksternal)
- [Skema Database](#skema-database)
- [Audio Graph](#audio-graph)
- [Batasan](#batasan)
- [Roadmap](#roadmap)
- [Lisensi](#lisensi)

---

## Fitur

### Manajemen Musik

- Import file audio satu per satu (multiple select)
- Import folder otomatis (rekursif subfolder) menjadi playlist
- Metadata ID3 dibaca otomatis: judul, artist, album, durasi, cover art
- Data disimpan di IndexedDB, tetap ada setelah refresh browser
- Multi playlist dengan playlist sistem "Library"

### Playlist

- Buat playlist otomatis dari nama folder saat import
- Rename playlist
- Hapus playlist (lagu dipindah ke Library, tidak hilang)
- Sidebar playlist bisa collapse/expand di PC
- Di mobile, daftar playlist jadi tab di main view

### Pemutar

- Play / pause
- Next / previous track
- Seek bar dengan durasi
- Kontrol volume
- Shuffle
- Repeat: off / all / one
- Player bar 2 baris di mobile, 1 baris di PC

### Lirik

- Auto-fetch dari LRCLIB berdasarkan judul, artist, album, durasi
- Dukungan lirik sinkron (LRC) dengan highlight baris aktif dan auto-scroll
- Fallback ke lirik plain jika tidak ada timestamp
- Cache di memori, hindari fetch ulang

### Terjemahan Lirik

- 3 mode: Plain, Indo, Inggris
- Terjemahan via MyMemory API
- Auto-detect bahasa sumber dari karakter (Hangul, Hiragana, Hanzi, Cyrillic, Arab, Thai, Latin)
- Paralel 4 baris sekaligus, delay 100ms antar batch
- Cache per bahasa di memori
- Fallback ke Inggris kalau terjemahan target gagal

### Equalizer

- 8-band parametric EQ berbasis weq8c
- Preset: Flat, Bass Boost, Vocal, Rock, Pop, Electronic
- Bisa atur manual per band
- UI modal dengan Web Component `<weq8-ui>`
- Custom dark theme via Shadow DOM CSS injection

### Responsif

- PC: 3 kolom (playlist, main, lirik)
- Mobile: 1 kolom dengan tab (Playlist, Lagu, Lirik)
- Sidebar overlay di mobile
- Player bar 2 baris di mobile

---

## Tech Stack

### Runtime

| Kategori | Library | Fungsi |
|---|---|---|
| Build tool | Vite | Dev server, bundler |
| UI | React | Komponen |
| Bahasa | TypeScript | Type safety |
| Icon | lucide-react | Icon SVG |

### Audio

| Kategori | Library | Fungsi |
|---|---|---|
| Metadata ID3 | music-metadata | Baca judul, artist, album, cover |
| Equalizer | weq8c | 8-band parametric EQ |
| Web Audio API | native | AudioContext, BiquadFilterNode |

### Storage

| Kategori | Library | Fungsi |
|---|---|---|
| IndexedDB | idb | Wrapper promise-based |

### API Eksternal

| Kategori | Service | Fungsi |
|---|---|---|
| Lirik | LRCLIB | Fetch lirik sinkron + plain |
| Terjemahan | MyMemory | Translate lirik |

---

## Arsitektur

Aplikasi single-page tanpa routing. State global di `App.tsx`, data di IndexedDB.

### Alur Data

```
File audio (user)
    |
    v
[Import] -- parseBlob (music-metadata) --> metadata + cover
    |
    v
IndexedDB (store: tracks, playlists)
    |
    v
[useTracks hook] -- reactive state --> UI
    |
    v
[usePlayer hook] -- audio element + Web Audio graph --> speaker
```

### Alur Lirik

```
Track aktif
    |
    v
[useLyrics] -- fetch LRCLIB --> parse LRC/plain
    |
    v
[LyricsView] -- highlight baris aktif + auto-scroll
    |
    v
[useTranslatedLyrics] -- MyMemory (paralel 4, delay 100ms) --> terjemahan
```

### Alur Audio + EQ

```
<audio> element
    |
    v
MediaElementSourceNode (sekali)
    |
    v
WEQ8Runtime (8 band)
    |
    v
AudioContext.destination
```

---

## Struktur Folder

```
music-player/
├── public/
├── src/
│   ├── components/
│   │   ├── EqualizerModal.tsx      Modal EQ
│   │   ├── Header.tsx              Header atas
│   │   ├── LyricsPanel.tsx         Panel lirik (mobile)
│   │   ├── LyricsSidebar.tsx       Sidebar lirik (PC)
│   │   ├── LyricsView.tsx          Render lirik (shared)
│   │   ├── MainView.tsx            Area utama
│   │   ├── PlayerBar.tsx           Player bawah
│   │   └── Sidebar.tsx             Sidebar playlist
│   ├── hooks/
│   │   ├── useEqualizer.ts         Akses runtime EQ
│   │   ├── useLyrics.ts            Fetch lirik
│   │   ├── usePlayer.ts            Audio player state
│   │   ├── usePlaylists.ts         CRUD playlist
│   │   ├── useTracks.ts            Track per playlist
│   │   └── useTranslatedLyrics.ts  Terjemahan lirik
│   ├── lib/
│   │   ├── audio.ts                Helper audio (URL, format)
│   │   ├── db.ts                   IndexedDB + metadata
│   │   ├── eq.ts                   Setup AudioContext + EQ
│   │   ├── eqPresets.ts            Definisi preset EQ
│   │   ├── lyrics.ts               Fetch + parse LRCLIB
│   │   └── translate.ts            MyMemory + deteksi bahasa
│   ├── styles/
│   │   ├── base.css                Variable + reset
│   │   ├── controls.css            Tombol
│   │   ├── header.css              Header
│   │   ├── layout.css              Grid layout
│   │   ├── lyrics-sidebar.css      Sidebar lirik
│   │   ├── main.css                Area utama + lirik
│   │   ├── modal.css               Modal
│   │   ├── player-bar.css          Player bar
│   │   ├── responsive.css          Media queries
│   │   └── sidebar.css             Sidebar playlist
│   ├── types/
│   │   └── weq8c.d.ts              Deklarasi tipe weq8c
│   ├── App.tsx                     Root
│   ├── App.css                     Entry point CSS
│   ├── index.css                   Global CSS
│   └── main.tsx                    React entry
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Cara Install

### Prasyarat

- Node.js 18+
- npm atau yarn

### Langkah

```bash
git clone https://github.com/kLinQin/egg-music.git
cd egg-music
npm install
npm run dev
```

Buka http://localhost:5173

### Build Produksi

```bash
npm run build
npm run preview
```

Hasil build di folder `dist/`.

---

## Cara Pakai

### Import Musik

1. Klik tombol "Tambah Lagu" di header untuk import file satu per satu
2. Klik "Tambah Folder" untuk import folder (jadi playlist baru, nama = nama folder)
3. Metadata (judul, artist, album, cover) dibaca otomatis

### Putar Musik

1. Klik playlist di sidebar
2. Klik lagu di daftar untuk memutar
3. Kontrol di player bar bawah

### Lirik

- PC: kolom ke-3 di kanan, toggle dengan tombol `‹` / `›`
- Mobile: tab "Lirik" di main view
- Pilih mode Plain / Indo / Inggris di header lirik

### Equalizer

1. Klik tombol EQ di player bar (icon slider)
2. Pilih preset atau atur manual per band
3. Perubahan langsung terasa saat lagu diputar

---

## API Eksternal

### LRCLIB

- URL: `https://lrclib.net/api/get`
- Parameter: `track_name`, `artist_name`, `album_name`, `duration`
- Tanpa API key
- Support lirik sinkron (LRC) dan plain
- Header: `Lrclib-Client: music-player-local/1.0`

### MyMemory

- URL: `https://api.mymemory.translated.net/get`
- Parameter: `q`, `langpair` (format `src|tgt`, mis. `ko|id`)
- Tanpa API key
- Rate limit anonim: 5000 karakter per hari
- Rate limit dengan email: 50000 karakter per hari
- Tidak support auto-detect. Bahasa sumber harus eksplisit.
- Per request: maksimal 500 byte

---

## Skema Database

### DB: `music-player` versi 3

#### Store: `tracks`

```typescript
{
  id: string;              // UUID
  name: string;            // Nama file asli
  type: string;            // MIME type (audio/mpeg, audio/flac, dll)
  data: ArrayBuffer;       // Isi file
  addedAt: number;         // Timestamp
  playlistId: string;      // ID playlist
  title?: string;          // Dari ID3
  artist?: string;
  album?: string;
  duration?: number;       // Detik
  coverType?: string;      // MIME type cover
  coverData?: ArrayBuffer; // Isi cover
  bitrate?: number;        // bps
  sampleRate?: number;     // Hz
  channels?: number;
  codec?: string;
}
```

Index: `by-addedAt`, `by-playlist`

#### Store: `playlists`

```typescript
{
  id: string;           // UUID atau 'library'
  name: string;
  createdAt: number;
  isSystem: boolean;    // true untuk Library
}
```

Index: `by-createdAt`

---

## Audio Graph

Equalizer terhubung sekali saat pertama kali `<audio>` mount. Tidak bisa di-reconnect karena Web Audio API membatasi `createMediaElementSource` hanya sekali per element.

```
HTMLAudioElement
    |
    v
MediaElementAudioSourceNode
    |
    v
WEQ8Runtime
    |-- input (GainNode)
    |-- filterbank (8 BiquadFilterNode)
    |-- output (GainNode)
    |-- debugAnalyser
    v
AudioContext.destination
```

Guard StrictMode: pakai `WeakMap<HTMLAudioElement, EqSetup>` di `lib/eq.ts`. Kalau element yang sama di-mount ulang, return setup lama untuk cegah `InvalidStateError`.

Resume AudioContext: Chrome memblokir AudioContext sebelum user gesture. `resumeEq()` dipanggil saat user klik play pertama.

---

## Batasan

### Browser

- File System Access API tidak dipakai. Hanya `webkitdirectory` (support semua browser modern).
- Autoplay diblokir sampai user gesture pertama.
- IndexedDB per origin. Clear browser data sama dengan lagu hilang.

### Lirik & Terjemahan

- LRCLIB tidak punya semua lagu. Lagu Korea/OST mungkin tidak ketemu.
- MyMemory rate limit 5000 karakter/hari (anonim). Translate lirik panjang bisa kena limit.
- MyMemory tidak support auto-detect. Kita deteksi manual dari karakter.
- Terjemahan tidak disimpan permanen (hanya cache memori). Refresh sama dengan translate ulang.

### Audio

- Format didukung tergantung browser (MP3, FLAC, M4A, OGG, WAV umumnya OK).
- File besar (>50MB) bisa lambat saat parse metadata.
- EQ aktif selalu setelah pertama play. Tidak ada mode bypass global.

### EQ UI

- `<weq8-ui>` pakai Web Component + Shadow DOM.
- Custom CSS via `addCustomStyles()`. Hanya bisa dipanggil sekali.
- Di mobile, tabel filter diubah jadi 2 baris per band via CSS injection.

---

## Roadmap

- [ ] Keyboard shortcut (space = play/pause, arrow = seek)
- [ ] Drag & drop lagu antar playlist
- [ ] Sort kolom (judul, artist, album, durasi)
- [ ] Search dalam playlist
- [ ] Seek ke baris lirik (klik baris synced)
- [ ] Persist preferensi (mode lirik, EQ preset) ke localStorage
- [ ] Baca metadata saat import lebih cepat (worker thread)
- [ ] Dukungan playlist berisi lagu dari multiple playlist (many-to-many)
- [ ] Export / import playlist (JSON)

---

## Lisensi

MIT