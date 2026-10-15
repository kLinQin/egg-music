import { useEffect, useRef, useState } from 'react';
import type { LyricLine } from '../lib/lyrics';
import { translateLine, QuotaError } from '../lib/translate';
import { translateGoogle, translateGoogleBatch } from '../lib/translateGoogle';

export type TranslateProvider = 'mymemory' | 'google';

type State = {
   loading: boolean;
   translations: string[];
   error: string | null;
   progress: number;
};

const memoryCache = new Map<string, string[]>();

// Flag global: kalau Google kena 429, skip Google untuk request berikutnya
let googleBlockedUntil = 0;

const GOOGLE_BLOCK_MS = 60_000;

function shouldTranslate(text: string): boolean {
   const t = text.trim();
   if (!t) return false;
   if (t.length < 3) return false;
   return true;
}

export function useTranslatedLyrics(
   lines: LyricLine[],
   targetLang: string,
   enabled: boolean,
   provider: TranslateProvider = 'mymemory'
) {
   const [state, setState] = useState<State>({
      loading: false,
      translations: [],
      error: null,
      progress: 0,
   });

   const cacheRef = useRef(memoryCache);

   const linesKey = lines.map((l) => `${l.time}|${l.text}`).join('\n');

   useEffect(() => {
      if (!enabled || lines.length === 0) {
         setState({ loading: false, translations: [], error: null, progress: 0 });
         return;
      }

      const cacheKey = `${provider}::${targetLang}::${linesKey}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
         setState({
            loading: false,
            translations: cached,
            error: null,
            progress: 100,
         });
         return;
      }

      let cancelled = false;
      setState({ loading: true, translations: [], error: null, progress: 0 });

      const run = async () => {
         const results: string[] = new Array(lines.length).fill('');
         let allFailed = true;

         // Kumpulkan index yang perlu diterjemahkan
         const indices: number[] = [];
         for (let i = 0; i < lines.length; i++) {
            if (shouldTranslate(lines[i].text)) indices.push(i);
         }

         if (indices.length === 0) {
            // Semua baris kosong
            cacheRef.current.set(cacheKey, results);
            setState({
               loading: false,
               translations: results,
               error: null,
               progress: 100,
            });
            return;
         }

         // ===== Helper: fallback per baris ke MyMemory =====
         const fallbackMyMemory = async (
            idxList: number[],
            lang: string
         ): Promise<number> => {
            let done = 0;
            const PARALLEL = 2;
            const DELAY = 400;

            for (let i = 0; i < idxList.length; i += PARALLEL) {
               if (cancelled) return done;
               const slice = idxList.slice(i, i + PARALLEL);
               await Promise.all(
                  slice.map(async (idx) => {
                     if (cancelled) return;
                     const text = lines[idx].text.trim();
                     try {
                        const res = await translateLine(text, lang);
                        if (res.translated) {
                           results[idx] = res.translated;
                           allFailed = false;
                        }
                     } catch (err) {
                        if (err instanceof QuotaError) {
                           console.warn('[translate] MyMemory quota habis');
                        } else {
                           console.warn('[translate:mymemory] gagal:', text, err);
                        }
                     }
                     done++;
                  })
               );
               if (!cancelled) {
                  const pct = Math.round((done / indices.length) * 100);
                  setState((s) => (s.loading ? { ...s, progress: pct } : s));
               }
               if (i + PARALLEL < idxList.length) {
                  await new Promise((r) => setTimeout(r, DELAY));
               }
            }
            return done;
         };

         // ===== Helper: Google batch =====
         const runGoogleBatch = async (lang: string): Promise<boolean> => {
            if (Date.now() < googleBlockedUntil) {
               return false;
            }
            const texts = indices.map((i) => lines[i].text.trim());
            try {
               const translated = await translateGoogleBatch(texts, lang);
               translated.forEach((t, k) => {
                  if (t) {
                     results[indices[k]] = t;
                     allFailed = false;
                  }
               });
               setState((s) => (s.loading ? { ...s, progress: 100 } : s));
               return true;
            } catch (err) {
               const msg = err instanceof Error ? err.message : String(err);
               if (msg.includes('429')) {
                  googleBlockedUntil = Date.now() + GOOGLE_BLOCK_MS;
               }
               console.warn(`[translate:google] batch gagal (${lang}):`, err);
               return false;
            }
         };

         // ===== Helper: Google per baris (fallback kalau batch gagal) =====
         const runGooglePerLine = async (
            idxList: number[],
            lang: string
         ): Promise<void> => {
            for (const idx of idxList) {
               if (cancelled) return;
               if (results[idx]) continue; // sudah ada dari batch
               if (Date.now() < googleBlockedUntil) return;
               const text = lines[idx].text.trim();
               try {
                  const res = await translateGoogle(text, lang);
                  if (res.translated) {
                     results[idx] = res.translated;
                     allFailed = false;
                  }
               } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  if (msg.includes('429')) {
                     googleBlockedUntil = Date.now() + GOOGLE_BLOCK_MS;
                     return;
                  }
                  console.warn('[translate:google] gagal:', text, err);
               }
            }
         };

         try {
            // Sumber bahasa: target dulu, fallback ke 'en'
            const sources = targetLang === 'en' ? [targetLang] : [targetLang, 'en'];

            // Urutan provider sesuai pilihan user
            const chain: TranslateProvider[] =
               provider === 'google'
                  ? ['google', 'mymemory']
                  : ['mymemory', 'google'];

            for (const lang of sources) {
               if (cancelled) return;

               // Cek apakah masih ada baris yang belum diterjemahkan
               const remaining = indices.filter((i) => !results[i]);
               if (remaining.length === 0) break;

               for (const p of chain) {
                  if (cancelled) return;

                  const stillRemaining = indices.filter((i) => !results[i]);
                  if (stillRemaining.length === 0) break;

                  if (p === 'google') {
                     // Coba batch dulu
                     const ok = await runGoogleBatch(lang);
                     if (!ok) {
                        // Batch gagal — coba per baris
                        await runGooglePerLine(stillRemaining, lang);
                     }
                  } else {
                     // MyMemory — per baris (tidak ada batch di API kita)
                     await fallbackMyMemory(stillRemaining, lang);
                  }
               }
            }

            if (!cancelled) {
               if (allFailed) {
                  setState({
                     loading: false,
                     translations: [],
                     error: 'Semua provider terjemahan gagal. Coba lagi nanti.',
                     progress: 0,
                  });
                  return;
               }
               cacheRef.current.set(cacheKey, results);
               setState({
                  loading: false,
                  translations: results,
                  error: null,
                  progress: 100,
               });
            }
         } catch (err) {
            if (cancelled) return;
            setState({
               loading: false,
               translations: [],
               error: (err as Error).message,
               progress: 0,
            });
         }
      };

      run();

      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [linesKey, targetLang, enabled, provider]);

   return state;
}