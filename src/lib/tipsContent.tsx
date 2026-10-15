import type { ReactNode } from 'react';
import {
   FolderPlus,
   Play,
   Pause,
   SkipBack,
   SkipForward,
   Shuffle,
   Repeat,
   Volume2,
   SlidersHorizontal,
   Music,
   Search,
   Smartphone,
   Bug,
   HelpCircle,
   Sparkles,
   BookOpen,
   Info,
   AlertTriangle,
   CheckCircle2,
} from 'lucide-react';

export type TipsSection = {
   id: string;
   title: string;
   content: ReactNode;
};

/* Icon inline kecil untuk dipakai di dalam teks */
function InlineIcon({ children }: { children: ReactNode }) {
   return <span className="tips__inline-icon">{children}</span>;
}

/* Hint box reusable */
function Hint({
   variant = 'info',
   children,
}: {
   variant?: 'info' | 'warning' | 'success';
   children: ReactNode;
}) {
   const Icon =
      variant === 'warning'
         ? AlertTriangle
         : variant === 'success'
            ? CheckCircle2
            : Info;

   return (
      <p className={`tips__hint tips__hint--${variant}`}>
         <Icon size={14} />
         <span>{children}</span>
      </p>
   );
}

export const TIPS_SECTIONS: TipsSection[] = [
   /* ===================== 1. Selamat Datang ===================== */
   {
      id: 'welcome',
      title: 'Selamat Datang',
      content: (
         <>
            <h2>Apa itu Egg Music?</h2>
            <p>
               <strong>Egg Music</strong> adalah music player lokal yang berjalan
               sepenuhnya di browser. Semua file musik Anda disimpan di{' '}
               <code>IndexedDB</code> — tidak di-upload ke server mana pun. Cukup
               import dari folder, putar, dan nikmati.
            </p>

            <h3>Fitur utama</h3>
            <ul>
               <li>
                  <strong>Import musik</strong> — tambah file satu-satu atau import
                  seluruh folder sekaligus.
               </li>
               <li>
                  <strong>Playlist</strong> — susun lagu jadi beberapa playlist,
                  rename, hapus.
               </li>
               <li>
                  <strong>Player lengkap</strong> — play/pause, next/prev, seek,
                  volume, mute, shuffle, repeat.
               </li>
               <li>
                  <strong>Equalizer 8-band</strong> — atur bass, mid, treble dengan
                  preset siap pakai.
               </li>
               <li>
                  <strong>Lirik otomatis</strong> — cari lirik dari LRCLIB atau
                  lyrics.ovh, lengkap dengan terjemahan.
               </li>
               <li>
                  <strong>Metadata lengkap</strong> — judul, artist, album, cover,
                  bitrate, format — otomatis dibaca dari file.
               </li>
               <li>
                  <strong>Media Session</strong> — kontrol dari lockscreen /
                  notification HP.
               </li>
            </ul>

            <Hint variant="info">
               Semua data tersimpan lokal di browser. Bersihkan data browser = file
               musik hilang. Backup file asli Anda tetap aman di folder komputer.
            </Hint>
         </>
      ),
   },

   /* ===================== 2. Import Musik ===================== */
   {
      id: 'import',
      title: 'Import Musik',
      content: (
         <>
            <h2>Menambahkan lagu ke library</h2>
            <p>Ada 2 cara menambahkan musik ke Egg Music:</p>

            <h3>
               <InlineIcon>
                  <FolderPlus size={14} />
               </InlineIcon>{' '}
               Import folder
            </h3>
            <ol>
               <li>
                  Klik tombol <strong>Tambah Folder</strong> di header.
               </li>
               <li>
                  Pilih folder musik Anda. Semua file audio di dalamnya (termasuk
                  subfolder) akan di-import.
               </li>
               <li>
                  Playlist baru otomatis dibuat dengan nama = nama folder.
               </li>
            </ol>
            <p>
               Kalau folder sudah pernah di-import, playlist baru akan otomatis
               diberi suffix — mis. <code>Rock (2)</code>.
            </p>

            <h3>
               <InlineIcon>
                  <Music size={14} />
               </InlineIcon>{' '}
               Tambah lagu satu-satu
            </h3>
            <ol>
               <li>
                  Klik tombol <strong>Tambah Lagu</strong> di header.
               </li>
               <li>
                  Pilih 1 atau lebih file audio. Lagu akan ditambahkan ke playlist
                  yang sedang aktif.
               </li>
            </ol>

            <h3>Format yang didukung</h3>
            <ul>
               <li>MP3</li>
               <li>FLAC (lossless)</li>
               <li>M4A / AAC</li>
               <li>OGG / Opus</li>
               <li>WAV</li>
            </ul>

            <Hint variant="info">
               Setelah import, metadata (judul, artist, album, cover, bitrate,
               durasi) otomatis dibaca dari file. Proses ini butuh waktu beberapa
               detik untuk folder besar.
            </Hint>
         </>
      ),
   },

   /* ===================== 3. Playlist ===================== */
   {
      id: 'playlist',
      title: 'Playlist',
      content: (
         <>
            <h2>Mengelola playlist</h2>
            <p>
               Sidebar kiri menampilkan daftar playlist. Setiap playlist punya
               lagu-lagunya sendiri.
            </p>

            <h3>Library</h3>
            <p>
               <strong>Library</strong> adalah playlist default yang tidak bisa
               dihapus. Semua lagu yang tidak masuk playlist lain ada di sini.
            </p>

            <h3>Buat playlist baru</h3>
            <p>
               Playlist baru dibuat otomatis saat Anda <strong>import folder</strong>
               — nama playlist = nama folder.
            </p>

            <h3>Rename playlist</h3>
            <ul>
               <li>Hover playlist di sidebar → klik ikon pencil.</li>
               <li>Ketik nama baru, tekan Enter.</li>
            </ul>

            <h3>Hapus playlist</h3>
            <ul>
               <li>Hover playlist → klik ikon trash.</li>
               <li>
                  Lagu-lagu di playlist itu akan <strong>dipindah ke Library</strong>,
                  bukan dihapus.
               </li>
            </ul>

            <Hint variant="warning">
               Menghapus playlist <strong>tidak</strong> menghapus lagu dari library.
               Lagu tetap ada di Library.
            </Hint>
         </>
      ),
   },

   /* ===================== 4. Player ===================== */
   {
      id: 'player',
      title: 'Player',
      content: (
         <>
            <h2>Kontrol pemutaran</h2>
            <p>
               Semua kontrol pemutaran ada di player bar bawah. Di PC 1 baris, di
               mobile 2 baris.
            </p>

            <h3>Kontrol dasar</h3>
            <ul>
               <li>
                  <InlineIcon>
                     <Play size={14} />
                  </InlineIcon>{' '}
                  /{' '}
                  <InlineIcon>
                     <Pause size={14} />
                  </InlineIcon>{' '}
                  — Play / Pause lagu.
               </li>
               <li>
                  <InlineIcon>
                     <SkipBack size={14} />
                  </InlineIcon>{' '}
                  — lagu sebelumnya.
               </li>
               <li>
                  <InlineIcon>
                     <SkipForward size={14} />
                  </InlineIcon>{' '}
                  — lagu berikutnya.
               </li>
               <li>
                  <InlineIcon>
                     <Volume2 size={14} />
                  </InlineIcon>{' '}
                  — klik untuk mute / unmute. Geser slider untuk atur volume.
               </li>
            </ul>

            <h3>Seek bar</h3>
            <p>
               Geser seek bar untuk lompat ke posisi manapun di lagu. Waktu saat ini
               dan durasi total ada di kiri-kanan bar.
            </p>

            <h3>Mute</h3>
            <ul>
               <li>Klik ikon speaker → mute (volume = 0).</li>
               <li>Klik lagi → unmute (kembali ke volume sebelumnya).</li>
               <li>
                  Geser slider volume saat mute → <strong>auto-unmute</strong>.
               </li>
            </ul>
         </>
      ),
   },

   /* ===================== 5. Shuffle & Repeat ===================== */
   {
      id: 'shuffle-repeat',
      title: 'Shuffle & Repeat',
      content: (
         <>
            <h2>Mode pemutaran</h2>

            <h3>
               <InlineIcon>
                  <Shuffle size={14} />
               </InlineIcon>{' '}
               Shuffle
            </h3>
            <ul>
               <li>
                  Klik ikon shuffle → tombol jadi hijau. Lagu berikutnya diacak.
               </li>
               <li>Klik lagi → matikan shuffle, kembali urut.</li>
            </ul>

            <h3>
               <InlineIcon>
                  <Repeat size={14} />
               </InlineIcon>{' '}
               Repeat
            </h3>
            <p>Klik ikon repeat untuk siklus 3 mode:</p>
            <ul>
               <li>
                  <strong>Off</strong> (abu) — lagu terakhir habis → berhenti.
               </li>
               <li>
                  <strong>All</strong> (hijau) — lagu terakhir habis → kembali ke
                  lagu pertama, terus loop.
               </li>
               <li>
                  <strong>One</strong> (hijau + angka 1) — lagu yang sama diulang
                  terus.
               </li>
            </ul>

            <Hint variant="info">
               Shuffle + Repeat All = acak terus tanpa berhenti. Kombinasi favorit
               untuk playlist besar.
            </Hint>
         </>
      ),
   },

   /* ===================== 6. Equalizer ===================== */
   {
      id: 'equalizer',
      title: 'Equalizer',
      content: (
         <>
            <h2>Mengatur suara</h2>
            <p>
               Klik ikon{' '}
               <InlineIcon>
                  <SlidersHorizontal size={14} />
               </InlineIcon>{' '}
               di player bar untuk buka equalizer.
            </p>

            <h3>8-band EQ</h3>
            <p>
               Setiap band mengatur frekuensi berbeda:
            </p>
            <ul>
               <li>
                  <strong>60 Hz</strong> — bass dalam (kick drum).
               </li>
               <li>
                  <strong>170 Hz</strong> — bass.
               </li>
               <li>
                  <strong>350 Hz</strong> — low-mid.
               </li>
               <li>
                  <strong>1 kHz</strong> — mid (vokal utama).
               </li>
               <li>
                  <strong>3.5 kHz</strong> — high-mid (kejelasan vokal).
               </li>
               <li>
                  <strong>8 kHz</strong> — treble (hi-hat, cymbal).
               </li>
               <li>
                  <strong>12 kHz</strong> — high treble.
               </li>
               <li>
                  <strong>16 kHz</strong> — air / sparkle.
               </li>
            </ul>

            <h3>Preset siap pakai</h3>
            <p>Pilih dari dropdown preset:</p>
            <ul>
               <li>
                  <strong>Flat</strong> — semua 0 (netral).
               </li>
               <li>
                  <strong>Bass Boost</strong> — bass ditonjolkan.
               </li>
               <li>
                  <strong>Vocal</strong> — vokal lebih jelas.
               </li>
               <li>
                  <strong>Rock</strong> — bass + treble.
               </li>
               <li>
                  <strong>Pop</strong> — mid + treble.
               </li>
               <li>
                  <strong>Electronic</strong> — bass + treble ekstrem.
               </li>
            </ul>

            <Hint variant="warning">
               Boost band terlalu tinggi bisa bikin suara pecah (clipping). Kalau
               terjadi, turunkan gain atau reset ke Flat.
            </Hint>
         </>
      ),
   },

   /* ===================== 7. Lirik ===================== */
   {
      id: 'lyrics',
      title: 'Lirik',
      content: (
         <>
            <h2>Lirik otomatis</h2>
            <p>
               Lirik dicari otomatis dari API <strong>LRCLIB</strong> atau{' '}
               <strong>lyrics.ovh</strong>. Kalau ada lirik tersinkronisasi (LRC),
               baris aktif akan di-highlight dan auto-scroll.
            </p>

            <h3>Sumber lirik</h3>
            <ul>
               <li>
                  <strong>LRCLIB</strong> — mendukung lirik sinkron (LRC) + plain.
                  Default.
               </li>
               <li>
                  <strong>lyrics.ovh</strong> — plain text saja, tapi katalog luas.
               </li>
            </ul>
            <p>Klik tombol provider di toolbar lirik untuk ganti sumber.</p>

            <h3>Terjemahan</h3>
            <p>Klik tombol mode:</p>
            <ul>
               <li>
                  <strong>Plain</strong> — lirik asli saja.
               </li>
               <li>
                  <strong>Indo</strong> — terjemahan Indonesia di bawah tiap baris.
               </li>
               <li>
                  <strong>Inggris</strong> — terjemahan Inggris.
               </li>
            </ul>

            <h3>Provider terjemahan</h3>
            <ul>
               <li>
                  <strong>Google</strong> — kualitas terbaik. Rate limit ketat.
               </li>
               <li>
                  <strong>MyMemory</strong> — gratis, stabil. Kualitas standar.
               </li>
            </ul>
            <p>
               Kalau Google limit, otomatis fallback ke MyMemory. Kalau dua-duanya
               gagal, lirik tetap tampil tanpa terjemahan.
            </p>

            <h3>Cari manual</h3>
            <ul>
               <li>
                  Klik ikon{' '}
                  <InlineIcon>
                     <Search size={14} />
                  </InlineIcon>{' '}
                  untuk cari lirik manual.
               </li>
               <li>Isi nama artist + judul lagu.</li>
               <li>Klik <strong>LRCLIB</strong> atau <strong>lyrics.ovh</strong>.</li>
            </ul>

            <Hint variant="info">
               Lirik tidak selalu ada — tergantung katalog API. Lagu indie atau
               cover sering tidak ketemu.
            </Hint>
         </>
      ),
   },

   /* ===================== 8. Mobile ===================== */
   {
      id: 'mobile',
      title: 'Mobile',
      content: (
         <>
            <h2>Pakai Egg Music di HP</h2>

            <h3>
               <InlineIcon>
                  <Smartphone size={14} />
               </InlineIcon>{' '}
               Layout mobile
            </h3>
            <ul>
               <li>Player bar 2 baris (kontrol atas, seek bawah).</li>
               <li>
                  Tab di main view: <strong>Playlist</strong> /{' '}
                  <strong>Lagu</strong> / <strong>Lirik</strong> / <strong>Tips</strong>.
               </li>
               <li>
                  Sidebar playlist <strong>tidak muncul</strong> — digantikan tab
                  "Playlist" di main view.
               </li>
            </ul>

            <h3>Import musik di mobile</h3>
            <ul>
               <li>Tap tombol "Tambah Folder" / "Tambah Lagu" di header.</li>
               <li>File picker HP akan terbuka.</li>
            </ul>

            <h3>Background play</h3>
            <p>
               Pakai <strong>Media Session API</strong> — musik tetap main walau
               pindah app atau layar mati. Kontrol muncul di notification / lockscreen.
            </p>

            <Hint variant="info">
               Di beberapa browser mobile, volume slider mungkin tidak muncul
               (tergantung OS). Gunakan tombol volume HP.
            </Hint>
         </>
      ),
   },

   /* ===================== 9. Keyboard Shortcuts ===================== */
   {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      content: (
         <>
            <h2>Shortcut keyboard</h2>

            <table className="tips__table">
               <thead>
                  <tr>
                     <th>Shortcut</th>
                     <th>Aksi</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>
                        <kbd>Space</kbd>
                     </td>
                     <td>Play / Pause</td>
                  </tr>
                  <tr>
                     <td>
                        <kbd>←</kbd> / <kbd>→</kbd>
                     </td>
                     <td>Seek ±5 detik</td>
                  </tr>
               </tbody>
            </table>

            <Hint variant="info">
               Shortcut akan ditambahkan di versi berikutnya. Untuk sekarang, semua
               kontrol via UI.
            </Hint>
         </>
      ),
   },

   /* ===================== 10. Troubleshooting ===================== */
   {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
         <>
            <h2>Masalah umum & solusinya</h2>

            <h3>
               <InlineIcon>
                  <Bug size={14} />
               </InlineIcon>{' '}
               Musik berhenti saat pindah aplikasi
            </h3>
            <p>
               <strong>Penyebab:</strong> browser membekukan JavaScript saat tab
               tidak aktif.
            </p>
            <p>
               <strong>Solusi:</strong> Egg Music pakai Media Session API — musik
               tetap main. Kalau masih berhenti, cek pengaturan hemat baterai HP —
               beberapa OS mematikan audio background.
            </p>

            <h3>
               <InlineIcon>
                  <Bug size={14} />
               </InlineIcon>{' '}
               Lirik tidak muncul
            </h3>
            <p>
               <strong>Penyebab:</strong> lagu tidak ada di database LRCLIB /
               lyrics.ovh.
            </p>
            <p>
               <strong>Solusi:</strong> coba cari manual (ikon search) dengan artist
               + judul yang benar. Atau ganti provider.
            </p>

            <h3>
               <InlineIcon>
                  <Bug size={14} />
               </InlineIcon>{' '}
               Terjemahan lambat / error
            </h3>
            <p>
               <strong>Penyebab:</strong> Google Translate rate limit (429).
            </p>
            <p>
               <strong>Solusi:</strong> Egg Music otomatis fallback ke MyMemory.
               Kalau dua-duanya gagal, coba lagi beberapa menit lagi.
            </p>

            <h3>
               <InlineIcon>
                  <Bug size={14} />
               </InlineIcon>{' '}
               File musik hilang setelah refresh
            </h3>
            <p>
               <strong>Penyebab:</strong> browser clear IndexedDB (private mode,
               storage penuh).
            </p>
            <p>
               <strong>Solusi:</strong> import ulang folder. File asli Anda tetap
               aman di komputer.
            </p>
         </>
      ),
   },

   /* ===================== 11. FAQ ===================== */
   {
      id: 'faq',
      title: 'FAQ',
      content: (
         <>
            <h2>Pertanyaan yang sering ditanya</h2>

            <h3>
               <InlineIcon>
                  <HelpCircle size={14} />
               </InlineIcon>{' '}
               Apakah file musik saya di-upload ke server?
            </h3>
            <p>
               <strong>Tidak.</strong> Semua file disimpan di IndexedDB browser Anda.
               Tidak ada upload ke server mana pun.
            </p>

            <h3>
               <InlineIcon>
                  <HelpCircle size={14} />
               </InlineIcon>{' '}
               Berapa banyak lagu yang bisa disimpan?
            </h3>
            <p>
               Tergantung kuota browser. Biasanya <strong>beberapa GB</strong>.
               Chrome ~60% dari disk kosong, Firefox ~50%.
            </p>

            <h3>
               <InlineIcon>
                  <HelpCircle size={14} />
               </InlineIcon>{' '}
               Bisakah buka di device lain?
            </h3>
            <p>
               <strong>Tidak otomatis.</strong> File di device A tidak sync ke
               device B. Untuk pindah, export folder asli atau import ulang di
               device baru.
            </p>

            <h3>
               <InlineIcon>
                  <HelpCircle size={14} />
               </InlineIcon>{' '}
               Lirik transalte pakai API apa?
            </h3>
            <p>
               <strong>Google Translate</strong> (via endpoint gratis) dan{' '}
               <strong>MyMemory</strong>. Keduanya tanpa API key.
            </p>

            <h3>
               <InlineIcon>
                  <HelpCircle size={14} />
               </InlineIcon>{' '}
               Equalizer disimpan?
            </h3>
            <p>
               Setelan EQ disimpan selama sesi. Refresh browser = reset ke Flat.
            </p>
         </>
      ),
   },

   /* ===================== 12. Tentang ===================== */
   {
      id: 'about',
      title: 'Tentang',
      content: (
         <>
            <h2>Tentang Egg Music</h2>
            <p>
               <strong>Egg Music</strong> adalah music player lokal berbasis browser
               — dibuat untuk memutar musik pribadi tanpa perlu server atau langganan
               streaming.
            </p>

            <h3>
               <InlineIcon>
                  <Sparkles size={14} />
               </InlineIcon>{' '}
               Fitur
            </h3>
            <ul>
               <li>Import folder rekursif dengan metadata otomatis</li>
               <li>Playlist multi-list dengan toggle sidebar</li>
               <li>Player lengkap (play/pause/next/prev/seek/volume/mute)</li>
               <li>Shuffle & repeat (off / all / one)</li>
               <li>Equalizer 8-band dengan 6 preset</li>
               <li>Lirik dari LRCLIB + lyrics.ovh</li>
               <li>Terjemahan lirik (Google / MyMemory)</li>
               <li>Media Session (lockscreen control)</li>
               <li>Cover art dari ID3 tag</li>
            </ul>

            <h3>
               <InlineIcon>
                  <BookOpen size={14} />
               </InlineIcon>{' '}
               Teknologi
            </h3>
            <table className="tips__table">
               <thead>
                  <tr>
                     <th>Komponen</th>
                     <th>Library</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>UI Framework</td>
                     <td>React + TypeScript</td>
                  </tr>
                  <tr>
                     <td>Build tool</td>
                     <td>Vite</td>
                  </tr>
                  <tr>
                     <td>Storage</td>
                     <td>IndexedDB (idb)</td>
                  </tr>
                  <tr>
                     <td>Metadata</td>
                     <td>music-metadata</td>
                  </tr>
                  <tr>
                     <td>Equalizer</td>
                     <td>weq8c</td>
                  </tr>
                  <tr>
                     <td>Icons</td>
                     <td>Lucide React</td>
                  </tr>
                  <tr>
                     <td>Lirik</td>
                     <td>LRCLIB + lyrics.ovh</td>
                  </tr>
               </tbody>
            </table>

            <Hint variant="success">
               <strong>Selamat mendengarkan!</strong> Semua fitur berjalan 100% di
               browser Anda.
            </Hint>
         </>
      ),
   },
];