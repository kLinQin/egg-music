import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import 'weq8c/ui';
import { useEqualizer } from '../hooks/useEqualizer';
import { EQ_PRESETS, applyPreset } from '../lib/eqPresets';

type Props = {
   open: boolean;
   onClose: () => void;
};

const LS_PRESET_INDEX = 'eq-preset-index';
const LS_GAINS = 'eq-gains';
const CUSTOM_INDEX = -1;

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
    .filters {
      display: inline-grid !important;
      grid-auto-flow: row !important;
      gap: 4px !important;
    }

    .filters tbody,
    .filters tr {
      display: contents !important;
    }

    .filters thead {
      display: grid !important;
      grid-auto-flow: column !important;
      grid-template-columns: 1fr 80px 60px 50px 40px !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .filters thead th {
      display: grid !important;
      place-content: center !important;
    }

    .filters tr td {
      display: grid !important;
      min-width: 0 !important;
    }

    .filters tr td .numberInput {
      min-width: 0 !important;
      width: 100% !important;
    }

    .filters tr th {
      grid-column: auto !important;
    }
  }
`;

let stylesInjected = false;

function loadPresetIndex(): number {
   try {
      const raw = localStorage.getItem(LS_PRESET_INDEX);
      if (raw === null) return 0;
      const n = Number(raw);
      if (Number.isInteger(n) && n >= CUSTOM_INDEX && n < EQ_PRESETS.length) {
         return n;
      }
   } catch {
      // ignore
   }
   return 0;
}

function loadGains(): number[] | null {
   try {
      const raw = localStorage.getItem(LS_GAINS);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
         Array.isArray(parsed) &&
         parsed.length === EQ_PRESETS[0].gains.length &&
         parsed.every((v) => typeof v === 'number' && Number.isFinite(v))
      ) {
         return parsed as number[];
      }
   } catch {
      // ignore
   }
   return null;
}

function saveGains(gains: number[]) {
   try {
      localStorage.setItem(LS_GAINS, JSON.stringify(gains));
   } catch {
      // ignore
   }
}

function savePresetIndex(idx: number) {
   try {
      localStorage.setItem(LS_PRESET_INDEX, String(idx));
   } catch {
      // ignore
   }
}

function detectPresetIndex(gains: number[]): number {
   for (let i = 0; i < EQ_PRESETS.length; i++) {
      const preset = EQ_PRESETS[i].gains;
      if (preset.length !== gains.length) continue;
      let match = true;
      for (let j = 0; j < preset.length; j++) {
         if (Math.abs(preset[j] - gains[j]) > 0.01) {
            match = false;
            break;
         }
      }
      if (match) return i;
   }
   return CUSTOM_INDEX;
}

export function EqualizerModal({ open, onClose }: Props) {
   const { runtime, ready } = useEqualizer();
   const uiRef = useRef<HTMLElement | null>(null);
   const [presetIndex, setPresetIndex] = useState<number>(loadPresetIndex);
   const appliedRef = useRef(false);

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

   // Apply saved gains sekali setelah runtime siap
   useEffect(() => {
      if (!open || !ready || !runtime) return;
      if (appliedRef.current) return;

      const saved = loadGains();
      if (saved) {
         saved.forEach((g, i) => runtime.setFilterGain(i, g));
      } else {
         const fallback = EQ_PRESETS[presetIndex >= 0 ? presetIndex : 0];
         applyPreset(runtime, fallback);
      }
      appliedRef.current = true;
   }, [open, ready, runtime, presetIndex]);

   // Subscribe filtersChanged → simpan gains, sinkron preset index
   useEffect(() => {
      if (!open || !ready || !runtime) return;

      const off = runtime.on('filtersChanged', (state) => {
         const filters = state as { gain: number }[];
         if (!Array.isArray(filters)) return;
         const gains = filters.map((f) => f.gain);
         saveGains(gains);
         const detected = detectPresetIndex(gains);
         setPresetIndex((prev) => {
            if (prev === detected) return prev;
            savePresetIndex(detected);
            return detected;
         });
      });

      return () => {
         if (typeof off === 'function') off();
      };
   }, [open, ready, runtime]);

   // Reset applied flag saat modal ditutup, supaya apply ulang saat dibuka
   useEffect(() => {
      if (!open) appliedRef.current = false;
   }, [open]);

   const handlePresetChange = (idx: number) => {
      if (idx === CUSTOM_INDEX) {
         setPresetIndex(CUSTOM_INDEX);
         savePresetIndex(CUSTOM_INDEX);
         return;
      }
      setPresetIndex(idx);
      savePresetIndex(idx);
      if (runtime) applyPreset(runtime, EQ_PRESETS[idx]);
   };

   if (!open) return null;

   const isCustom = presetIndex === CUSTOM_INDEX;
   const selectValue = isCustom ? CUSTOM_INDEX : presetIndex;

   return (
      <div className="modal-backdrop modal-backdrop-eq" onClick={onClose}>
         <div className="modal eq-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header eq-header">
               <span className="modal-title">Equalizer</span>
               <div className="eq-header-right">
                  <label htmlFor="eq-preset" className="eq-preset-label">
                     Preset
                  </label>
                  <select
                     id="eq-preset"
                     className="eq-preset-select"
                     value={selectValue}
                     onChange={(e) => handlePresetChange(Number(e.target.value))}
                  >
                     {EQ_PRESETS.map((p, i) => (
                        <option key={p.name} value={i}>
                           {p.name}
                        </option>
                     ))}
                     <option value={CUSTOM_INDEX}>Custom</option>
                  </select>
                  <button
                     className="btn icon-btn"
                     onClick={onClose}
                     title="Tutup"
                  >
                     <X size={18} />
                  </button>
               </div>
            </div>

            <div className="modal-body eq-modal-body">
               <div className="eq-mobile-hint">
                  Putar HP ke landscape untuk tampilan lebih baik
               </div>
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