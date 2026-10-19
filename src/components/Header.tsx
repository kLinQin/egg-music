import { Plus, FolderPlus, Trash2 } from 'lucide-react';

type Props = {
   onAddFiles: () => void;
   onAddFolder: () => void;
   onClearStorage: () => void;
   importProgress: { done: number; total: number } | null;
};

export function Header({
   onAddFiles,
   onAddFolder,
   onClearStorage,
   importProgress,
}: Props) {
   return (
      <header className="header">
         <div className="header-brand">
            <img className="header-logo" src="/favicon.svg" alt="Egg Music" />
            <span className="header-title">Egg Music</span>
         </div>

         {importProgress && (
            <div className="header-progress">
               Mengimport... {importProgress.done}/{importProgress.total}
            </div>
         )}

         <div className="header-actions">
            <button
               className="btn primary"
               onClick={onClearStorage}
               title="Hapus Storage"
            >
               <Trash2 size={16} />
               <span className="btn-label">
                  <span className="btn-label-verb">Hapus </span>
                  <span className="btn-label-noun">Storage</span>
               </span>
            </button>
            <button className="btn primary" onClick={onAddFolder} title="Tambah Folder">
               <FolderPlus size={16} />
               <span className="btn-label">
                  <span className="btn-label-verb">Tambah </span>
                  <span className="btn-label-noun">Folder</span>
               </span>
            </button>
            <button className="btn primary" onClick={onAddFiles} title="Tambah Lagu">
               <Plus size={16} />
               <span className="btn-label">
                  <span className="btn-label-verb">Tambah </span>
                  <span className="btn-label-noun">Lagu</span>
               </span>
            </button>
         </div>
      </header>
   );
}