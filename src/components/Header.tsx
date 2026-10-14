import { Plus, FolderPlus } from 'lucide-react';

type Props = {
   onAddFiles: () => void;
   onAddFolder: () => void;
   importProgress: { done: number; total: number } | null;
};

export function Header({ onAddFiles, onAddFolder, importProgress }: Props) {
   return (
      <header className="header">
         <div className="header-brand">
            <div className="header-logo">♪</div>
            <span className="header-title">Music Player</span>
         </div>

         {importProgress && (
            <div className="header-progress">
               Mengimport... {importProgress.done}/{importProgress.total}
            </div>
         )}

         <div className="header-actions">
            <button className="btn" onClick={onAddFolder} title="Tambah Folder">
               <FolderPlus size={16} />
               <span className="btn-label">Tambah Folder</span>
            </button>
            <button className="btn primary" onClick={onAddFiles} title="Tambah Lagu">
               <Plus size={16} />
               <span className="btn-label">Tambah Lagu</span>
            </button>
         </div>
      </header>
   );
}