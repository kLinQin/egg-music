import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, X, FileJson } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { BackupJsonModal } from './BackupJsonModal';
import { exportData, importData, resetAllData, type ImportResult } from '../lib/db';

type Props = {
   open: boolean;
   onClose: () => void;
};

export function ImportResultSummary({ result }: { result: ImportResult }) {
   return (
      <>
         Import selesai: {result.addedPlaylists} playlist ditambahkan,{' '}
         {result.skippedPlaylists} dilewati; {result.addedPendingTracks} lirik/lagu
         pending ditambahkan, {result.skippedPendingTracks} dilewati.
         {result.restoredEq && <> EQ dipulihkan.</>}
         {result.restoredLyricsPrefs && <> Preferensi lirik dipulihkan.</>}
         {result.legacyIgnored && (
            <> File backup versi lama — track/playlist diabaikan.</>
         )}
      </>
   );
}

export function SettingsModal({ open, onClose }: Props) {
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
   const [importResult, setImportResult] = useState<ImportResult | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [busy, setBusy] = useState(false);
   const [jsonModal, setJsonModal] = useState<{
      open: boolean;
      mode: 'export' | 'import';
   }>({ open: false, mode: 'export' });

   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && !clearConfirmOpen && !jsonModal.open) onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [open, onClose, clearConfirmOpen, jsonModal.open]);

   useEffect(() => {
      if (!open) {
         setImportResult(null);
         setError(null);
         setJsonModal({ open: false, mode: 'export' });
      }
   }, [open]);

   if (!open) return null;

   const handleExport = async () => {
      setError(null);
      setImportResult(null);
      try {
         const data = await exportData();
         const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
         });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         const ts = new Date()
            .toISOString()
            .replace(/[-:]/g, '')
            .replace('T', '-')
            .slice(0, 15);
         a.href = url;
         a.download = `egg-music-backup-${ts}.json`;
         document.body.appendChild(a);
         a.click();
         a.remove();
         URL.revokeObjectURL(url);
      } catch (err) {
         setError((err as Error).message);
      }
   };

   const handleImportClick = () => {
      setError(null);
      setImportResult(null);
      fileInputRef.current?.click();
   };

   const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      setBusy(true);
      setError(null);
      setImportResult(null);

      try {
         const text = await file.text();
         const parsed = JSON.parse(text);
         const result = await importData(parsed);
         setImportResult(result);
      } catch (err) {
         setError((err as Error).message || 'Gagal import backup.');
      } finally {
         setBusy(false);
      }
   };

   const handleClearStorage = async () => {
      setClearConfirmOpen(false);
      await resetAllData();
      try {
         localStorage.clear();
      } catch {
         // ignore
      }
      location.reload();
   };

   const reloadAfterImport = () => {
      location.reload();
   };

   return (
      <>
         <div className="modal-backdrop modal-backdrop-settings" onClick={onClose}>
            <div
               className="modal settings-modal"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="modal-header">
                  <span className="modal-title">Settings</span>
                  <button
                     className="btn icon-btn"
                     onClick={onClose}
                     title="Tutup"
                  >
                     <X size={18} />
                  </button>
               </div>

               <div className="modal-body settings-body">
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

                  <div className="settings-section">
                     <h3 className="settings-section-title">Backup (File)</h3>
                     <p className="settings-section-desc">
                        Backup pengaturan, playlist, dan metadata lagu ke file JSON
                        (tanpa file audio).
                     </p>
                     <button className="btn secondary" onClick={handleExport}>
                        <Download size={14} />
                        <span>Export JSON</span>
                     </button>
                  </div>

                  <div className="settings-section">
                     <h3 className="settings-section-title">Restore (File)</h3>
                     <p className="settings-section-desc">
                        Import file JSON hasil backup. Data dengan nama yang sudah ada
                        akan dilewati.
                     </p>
                     <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={handleFileSelected}
                     />
                     <button
                        className="btn secondary"
                        onClick={handleImportClick}
                        disabled={busy}
                     >
                        <Upload size={14} />
                        <span>{busy ? 'Mengimport...' : 'Import JSON'}</span>
                     </button>
                  </div>

                  <div className="settings-section">
                     <h3 className="settings-section-title">Backup / Restore (Text)</h3>
                     <p className="settings-section-desc">
                        Salin atau tempel JSON langsung di dalam aplikasi.
                     </p>
                     <div className="settings-inline-actions">
                        <button
                           className="btn secondary"
                           onClick={() =>
                              setJsonModal({ open: true, mode: 'export' })
                           }
                        >
                           <FileJson size={14} />
                           <span>Export (Text)</span>
                        </button>
                        <button
                           className="btn secondary"
                           onClick={() =>
                              setJsonModal({ open: true, mode: 'import' })
                           }
                        >
                           <FileJson size={14} />
                           <span>Import (Text)</span>
                        </button>
                     </div>
                  </div>

                  <div className="settings-section settings-section-danger">
                     <h3 className="settings-section-title">Hapus Storage</h3>
                     <p className="settings-section-desc">
                        Hapus semua lagu, playlist, lirik manual, dan cache. Tindakan
                        ini tidak bisa dibatalkan.
                     </p>
                     <button
                        className="btn danger"
                        onClick={() => setClearConfirmOpen(true)}
                     >
                        <Trash2 size={14} />
                        <span>Hapus Storage</span>
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <ConfirmDialog
            open={clearConfirmOpen}
            title="Hapus Storage"
            message="Hapus semua lagu, playlist, dan cache? Tindakan ini tidak bisa dibatalkan."
            confirmLabel="Hapus"
            onConfirm={handleClearStorage}
            onCancel={() => setClearConfirmOpen(false)}
         />

         <BackupJsonModal
            open={jsonModal.open}
            mode={jsonModal.mode}
            onClose={() => setJsonModal({ open: false, mode: jsonModal.mode })}
         />
      </>
   );
}