import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import 'weq8c/ui';
import { useEqualizer } from '../hooks/useEqualizer';
import { EQ_PRESETS, applyPreset } from '../lib/eqPresets';

type Props = {
   open: boolean;
   onClose: () => void;
};

const DARK_CSS = `
  :host {
    --weq8-background: #181818;
    --weq8-foreground: #e8e8e8;
    --weq8-muted: #6a6a6a;
    --weq8-accent: #1db954;
    --weq8-grid-line: #2a2a2a;
    --weq8-filter-band: #1db954;
    --weq8-filter-band-hover: #1ed760;
    background: #181818;
    color: #e8e8e8;
  }

  :host * {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  @media (max-width: 700px) {
    .filters thead {
      display: none;
    }

    .filters {
      display: block;
      width: 100%;
    }

    .filters tbody {
      display: block;
    }

    .filters tr {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      padding: 8px 4px;
      border-bottom: 1px solid #2a2a2a;
    }

    .filters tr th {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
    }

    .filters tr td {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
    }

    .filters tr td .numberInput {
      min-width: 0;
      width: 100%;
    }
  }
`;

let stylesInjected = false;

export function EqualizerModal({ open, onClose }: Props) {
   const { runtime, ready } = useEqualizer();
   const uiRef = useRef<HTMLElement | null>(null);
   const [presetIndex, setPresetIndex] = useState(0);

   useEffect(() => {
      if (!stylesInjected) {
         const UIElement = customElements.get('weq8-ui') as
            | (CustomElementConstructor & { addCustomStyles?: (css: string) => void })
            | undefined;
         UIElement?.addCustomStyles?.(DARK_CSS);
         stylesInjected = true;
      }
   }, []);

   useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [open, onClose]);

   useEffect(() => {
      if (!open || !runtime || !uiRef.current) return;
      (uiRef.current as HTMLElement & { runtime: unknown }).runtime = runtime;
   }, [open, runtime]);

   const handlePresetChange = (idx: number) => {
      setPresetIndex(idx);
      if (!runtime) return;
      applyPreset(runtime, EQ_PRESETS[idx]);
   };

   if (!open) return null;

   return (
      <div className="modal-backdrop" onClick={onClose}>
         <div className="modal eq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
               <span className="modal-title">Equalizer</span>
               <button className="btn icon-btn" onClick={onClose} title="Tutup">
                  <X size={18} />
               </button>
            </div>

            <div className="eq-preset-bar">
               <label htmlFor="eq-preset">Preset</label>
               <select
                  id="eq-preset"
                  className="eq-preset-select"
                  value={presetIndex}
                  onChange={(e) => handlePresetChange(Number(e.target.value))}
               >
                  {EQ_PRESETS.map((p, i) => (
                     <option key={p.name} value={i}>
                        {p.name}
                     </option>
                  ))}
               </select>
            </div>

            <div className="modal-body eq-modal-body">
               {ready ? (
                  <weq8-ui ref={uiRef as unknown as React.Ref<HTMLElement>} />
               ) : (
                  <div className="lyrics-placeholder">Menyiapkan equalizer...</div>
               )}
            </div>
         </div>
      </div>
   );
}