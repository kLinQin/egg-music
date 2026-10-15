import { useEffect, useRef, useState } from 'react';
import type { LyricLine } from '../lib/lyrics';
import { translateLine, QuotaError } from '../lib/translate';
import { translateGoogle } from '../lib/translateGoogle';

export type TranslateProvider = 'mymemory' | 'google';

type State = {
   loading: boolean;
   translations: string[];
   error: string | null;
   progress: number;
};

const memoryCache = new Map<string, string[]>();

// Flag global: kalau Google kena 429, skip Google untuk request berikutnya
// selama sesi ini (biar tidak spam dan fallback langsung ke MyMemory)
let googleBlockedUntil = 0;

function params(provider: TranslateProvider) {
   return provider === 'google'
      ? { parallel: 1, delay: 2000 }
      : { parallel: 2, delay: 400 };
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

      const { parallel: PARALLEL, delay: DELAY_MS } = params(provider);

      const run = async () => {
         const results: string[] = new Array(lines.length).fill('');
         let done = 0;
         let allFailed = true;
         let googleFails = 0;

         const shouldTranslate = (text: string) => {
            const t = text.trim();
            if (!t) return false;
            if (t.length < 3) return false;
            return true;
         };

         const tryGoogle = async (text: string, lang: string) => {
            // Kalau Google baru saja 429, skip dulu
            if (Date.now() < googleBlockedUntil) {
               throw new Error('Google Translate sedang rate-limited');
            }
            try {
               const res = await translateGoogle(text, lang);
               return res.translated;
            } catch (err) {
               // Kalau 429, blokir Google 60 detik
               if (err instanceof Error && err.message.includes('429')) {
                  googleBlockedUntil = Date.now() + 60_000;
                  googleFails++;
               }
               throw err;
            }
         };

         const tryMyMemory = async (text: string, lang: string) => {
            const res = await translateLine(text, lang);
            return res.translated;
         };

         const translateAt = async (i: number) => {
            if (cancelled) return;
            const text = lines[i].text.trim();
            if (!shouldTranslate(text)) {
               done++;
               return;
            }

            const sources = targetLang === 'en' ? [targetLang] : [targetLang, 'en'];

            for (const lang of sources) {
               if (cancelled) return;

               // Urutan provider: pilihan user dulu, lalu fallback
               const chain: TranslateProvider[] =
                  provider === 'google'
                     ? ['google', 'mymemory']
                     : ['mymemory', 'google'];

               for (const p of chain) {
                  if (cancelled) return;
                  try {
                     const translated =
                        p === 'google'
                           ? await tryGoogle(text, lang)
                           : await tryMyMemory(text, lang);
                     if (translated) {
                        results[i] = translated;
                        allFailed = false;
                        done++;
                        if (!cancelled) {
                           const pct = Math.round((done / lines.length) * 100);
                           setState((s) => (s.loading ? { ...s, progress: pct } : s));
                        }
                        return;
                     }
                  } catch (err) {
                     if (err instanceof QuotaError && p === 'mymemory') {
                        console.warn('[translate] MyMemory quota habis, lanjut');
                        continue;
                     }
                     console.warn(`[translate:${p}] gagal (${lang}):`, text, err);
                  }
               }
            }

            // Semua provider gagal untuk baris ini
            done++;
            if (!cancelled) {
               const pct = Math.round((done / lines.length) * 100);
               setState((s) => (s.loading ? { ...s, progress: pct } : s));
            }
         };

         try {
            for (let i = 0; i < lines.length; i += PARALLEL) {
               if (cancelled) return;

               const batch: Promise<void>[] = [];
               for (let j = i; j < Math.min(i + PARALLEL, lines.length); j++) {
                  batch.push(translateAt(j));
               }
               await Promise.all(batch);

               if (i + PARALLEL < lines.length) {
                  await new Promise((r) => setTimeout(r, DELAY_MS));
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