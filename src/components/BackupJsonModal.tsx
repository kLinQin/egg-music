import { useEffect, useRef, useState } from 'react';
import { Copy, X } from 'lucide-react';
import { exportData, importData, type ImportResult } from '../lib/db';
import { ImportResultSummary } from './SettingsModal';

type Props = {
   open: boolean;
   mode: 'export' | 'import';
   onClose: () => void;
};

export function BackupJsonModal({ open, mode, onClose }: Props) {
   const [text, setText] = useState('');
   const [loading, setLoading] = useState(false);
   const [busy, setBusy] = useState(false);
   const [copied, setCopied] = useState(false);
   const [importResult, setImportResult] = useState<ImportResult | null>(null);
   const [error, setError] = useState<string | null>(null);

   const copyTimeoutRef = useRef<number | null>(null);

   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [open, onClose]);

   useEffect(() => {
      if (!open) {
         setText('');
         setError(null);
         setImportResult(null);
         setCopied(false);
         return;
      }

      if (mode === 'export') {
         setLoading(true);
         setError(null);
         exportData()
            .then((data) => {
               setText(JSON.stringify(data, null, 2));
            })
            .catch((err) => {
               setError((err as Error).message);
            })
            .finally(() => setLoading(false));
      }
   }, [open, mode]);

   useEffect(() => {
      return () => {
         if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
         }
      };
   }, []);

   if (!open) return null;

   const handleCopy = async () => {
      try {
         await navigator.clipboard.writeText(text);
         setCopied(true);
         if (copyTimeoutRef.current !== null) {
            window.clearTimeout(copyTimeoutRef.current);
         }
         copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
      } catch (err) {
         setError((err as Error).message || 'Gagal menyalin.');
      }
   };

   const handleImport = async () => {
      if (!text.trim()) return;
      setBusy(true);
      setError(null);
      setImportResult(null);
      try {
         const parsed = JSON.parse(text);
         const result = await importData(parsed);
         setImportResult(result);
      } catch (err) {
         setError((err as Error).message || 'Gagal import.');
      } finally {
         setBusy(false);
      }
   };

   const reloadAfterImport = () => {
      location.reload();
   };

   return (
      <div className="modal-backdrop modal-backdrop-backup" onClick={onClose}>
         <div
            className="modal backup-json-modal"
            onClick={(e) => e.stopPropagation()}
         >
            <div className="modal-header">
               <span className="modal-title">
                  {mode === 'export' ? 'Export JSON (Text)' : 'Import JSON (Text)'}
               </span>
               <button className="btn icon-btn" onClick={onClose} title="Tutup">
                  <X size={18} />
               </button>
            </div>

            <div className="modal-body backup-json-body">
               {error && <div className="settings-error">{error}</div>}

               {importResult && (
                  <div className="settings-success">
                     <ImportResultSummary result={importResult} />
                     <div className="settings-success-actions">
                        <button className="btn secondary" onClick={reloadAfterImport}>
                           Reload Sekarang
                        </button>
                     </div>
                  </div>
               )}

               <textarea
                  className="backup-json-textarea"
                  placeholder={
                     mode === 'export'
                        ? 'Memuat data...'
                        : 'Tempel JSON backup di sini...'
                  }
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  readOnly={mode === 'export'}
                  spellCheck={false}
                  autoFocus={mode === 'import'}
               />
            </div>

            <div className="confirm-actions backup-json-actions">
               {mode === 'export' ? (
                  <button
                     className="btn secondary"
                     onClick={handleCopy}
                     disabled={loading || !text}
                  >
                     <Copy size={14} />
                     <span>{copied ? 'Tersalin' : 'Copy'}</span>
                  </button>
               ) : (
                  <div className="backup-json-actions-right">
                     <button className="btn secondary" onClick={onClose}>
                        Batal
                     </button>
                     <button
                        className="btn primary"
                        onClick={handleImport}
                        disabled={busy || !text.trim()}
                     >
                        <span>{busy ? 'Mengimport...' : 'Import'}</span>
                     </button>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}