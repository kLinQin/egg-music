import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Upload, Database } from 'lucide-react';

type SearchLink = {
   label: string;
   url: string;
};

export type PendingLyricOption = {
   key: string;
   label: string;
   text: string;
};

type Props = {
   open: boolean;
   initialText: string;
   hasManual: boolean;
   searchLinks: SearchLink[];
   pendingLyrics: PendingLyricOption[];
   onChange: (text: string) => void;
   onSave: () => void;
   onDelete: () => void;
   onClose: () => void;
};

export function ManualLyricsModal({
   open,
   initialText,
   hasManual,
   searchLinks,
   pendingLyrics,
   onChange,
   onSave,
   onDelete,
   onClose,
}: Props) {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [dropdownOpen, setDropdownOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            if (dropdownOpen) setDropdownOpen(false);
            else onClose();
         }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [open, onClose, dropdownOpen]);

   useEffect(() => {
      if (!dropdownOpen) return;
      const onClick = (e: MouseEvent) => {
         const target = e.target as HTMLElement;
         if (!target.closest('.manual-lyrics-backup')) {
            setDropdownOpen(false);
         }
      };
      document.addEventListener('mousedown', onClick);
      return () => document.removeEventListener('mousedown', onClick);
   }, [dropdownOpen]);

   useEffect(() => {
      if (!open) setDropdownOpen(false);
   }, [open]);

   if (!open) return null;

   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      try {
         const text = await file.text();
         if (!text.trim()) return;
         onChange(text);
      } catch (err) {
         console.warn('[manual-lyrics] gagal baca file:', err);
      }
   };

   const applyPending = (text: string) => {
      onChange(text);
      setDropdownOpen(false);
   };

   const hasPending = pendingLyrics.length > 0;

   return (
      <div className="modal-backdrop modal-backdrop-manual" onClick={onClose}>
         <div
            className="modal manual-lyrics-modal"
            onClick={(e) => e.stopPropagation()}
         >
            <div className="modal-header">
               <span className="modal-title">Lirik Manual</span>
            </div>

            <div className="modal-body manual-lyrics-body">
               <div className="manual-lyrics-links">
                  <span className="manual-lyrics-links-label">Cari lirik:</span>
                  {searchLinks.map((link) => (
                     <a
                        key={link.url}
                        className="manual-lyrics-link"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        <span>{link.label}</span>
                        <ExternalLink size={12} />
                     </a>
                  ))}

                  <div className="manual-lyrics-backup" ref={dropdownRef}>
                     <button
                        className="manual-lyrics-link"
                        onClick={() => setDropdownOpen((v) => !v)}
                        disabled={!hasPending}
                        title={
                           hasPending
                              ? 'Lirik dari backup'
                              : 'Tidak ada lirik dari backup'
                        }
                        type="button"
                     >
                        <Database size={12} />
                        <span>Backup</span>
                     </button>

                     {dropdownOpen && hasPending && (
                        <div className="manual-lyrics-backup-dropdown">
                           {pendingLyrics.map((opt) => (
                              <button
                                 key={opt.key}
                                 className="manual-lyrics-backup-item"
                                 onClick={() => applyPending(opt.text)}
                                 type="button"
                              >
                                 {opt.label}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               <textarea
                  className="lyrics-manual-textarea"
                  placeholder="Tempel atau ketik lirik di sini. Dukung format LRC ([mm:ss.xx]) atau teks biasa."
                  value={initialText}
                  onChange={(e) => onChange(e.target.value)}
                  spellCheck={false}
                  autoFocus
               />
            </div>

            <div className="confirm-actions manual-lyrics-actions">
               <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.lrc"
                  hidden
                  onChange={handleUpload}
               />
               <button
                  className="btn secondary"
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Upload size={14} />
                  <span>Upload</span>
               </button>
               <div className="manual-lyrics-actions-right">
                  <button className="btn secondary" onClick={onClose}>
                     Batal
                  </button>
                  {hasManual && (
                     <button className="btn danger" onClick={onDelete}>
                        Hapus
                     </button>
                  )}
                  <button
                     className="btn primary"
                     onClick={onSave}
                     disabled={!initialText.trim()}
                  >
                     Simpan
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}