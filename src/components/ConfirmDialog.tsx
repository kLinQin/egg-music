import { useEffect } from 'react';

type Props = {
   open: boolean;
   title: string;
   message: string;
   confirmLabel?: string;
   cancelLabel?: string;
   danger?: boolean;
   onConfirm: () => void;
   onCancel: () => void;
};

export function ConfirmDialog({
   open,
   title,
   message,
   confirmLabel = 'Hapus',
   cancelLabel = 'Batal',
   danger = true,
   onConfirm,
   onCancel,
}: Props) {
   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onCancel();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [open, onCancel]);

   if (!open) return null;

   return (
      <div className="modal-backdrop" onClick={onCancel}>
         <div
            className="modal confirm-modal"
            onClick={(e) => e.stopPropagation()}
         >
            <div className="modal-header">
               <span className="modal-title">{title}</span>
            </div>

            <div className="modal-body">
               <p className="confirm-message">{message}</p>
            </div>

            <div className="confirm-actions">
               <button className="btn" onClick={onCancel}>
                  {cancelLabel}
               </button>
               <button
                  className={`btn ${danger ? 'danger' : 'primary'}`}
                  onClick={onConfirm}
               >
                  {confirmLabel}
               </button>
            </div>
         </div>
      </div>
   );
}