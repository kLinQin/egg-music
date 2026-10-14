import { useEffect, useRef, useState } from 'react';
import type { LyricLine } from '../lib/lyrics';
import { translateLine } from '../lib/translate';

type State = {
   loading: boolean;
   translations: string[];
   error: string | null;
};

const PARALLEL = 4;
const DELAY_MS = 100;

const memoryCache = new Map<string, string[]>();

export function useTranslatedLyrics(
   lines: LyricLine[],
   targetLang: string,
   enabled: boolean
) {
   const [state, setState] = useState<State>({
      loading: false,
      translations: [],
      error: null,
   });

   const cacheRef = useRef(memoryCache);

   const linesKey = lines.map((l) => `${l.time}|${l.text}`).join('\n');

   useEffect(() => {
      if (!enabled || lines.length === 0) {
         setState({ loading: false, translations: [], error: null });
         return;
      }

      const cacheKey = `${targetLang}::${linesKey}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
         setState({ loading: false, translations: cached, error: null });
         return;
      }

      let cancelled = false;
      setState({ loading: true, translations: [], error: null });

      const run = async () => {
         const results: string[] = new Array(lines.length).fill('');

         const translateAt = async (i: number) => {
            if (cancelled) return;
            const text = lines[i].text.trim();
            if (!text) return;

            // Coba target dulu, fallback ke 'en' kalau target bukan 'en'
            const sources = targetLang === 'en' ? [targetLang] : [targetLang, 'en'];

            for (const lang of sources) {
               try {
                  const res = await translateLine(text, lang);
                  results[i] = res.translated;
                  return;
               } catch (err) {
                  console.warn(`[translate] gagal (${lang}):`, text, err);
               }
            }
            results[i] = '';
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
               cacheRef.current.set(cacheKey, results);
               setState({ loading: false, translations: results, error: null });
            }
         } catch (err) {
            if (cancelled) return;
            setState({
               loading: false,
               translations: [],
               error: (err as Error).message,
            });
         }
      };

      run();

      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [linesKey, targetLang, enabled]);

   return state;
}