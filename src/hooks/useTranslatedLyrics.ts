import { useEffect, useRef, useState } from 'react';
import type { LyricLine } from '../lib/lyrics';
import { translateLine, QuotaError } from '../lib/translate';

type State = {
   loading: boolean;
   translations: string[];
   error: string | null;
   progress: number;
};

const PARALLEL = 2;
const DELAY_MS = 400;

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
      progress: 0,
   });

   const cacheRef = useRef(memoryCache);

   const linesKey = lines.map((l) => `${l.time}|${l.text}`).join('\n');

   useEffect(() => {
      if (!enabled || lines.length === 0) {
         setState({ loading: false, translations: [], error: null, progress: 0 });
         return;
      }

      const cacheKey = `${targetLang}::${linesKey}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
         setState({ loading: false, translations: cached, error: null, progress: 100 });
         return;
      }

      let cancelled = false;
      setState({ loading: true, translations: [], error: null, progress: 0 });

      const run = async () => {
         const results: string[] = new Array(lines.length).fill('');
         let done = 0;

         const shouldTranslate = (text: string) => {
            const t = text.trim();
            if (!t) return false;
            if (t.length < 3) return false;
            return true;
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
               try {
                  const res = await translateLine(text, lang);
                  results[i] = res.translated;
                  break;
               } catch (err) {
                  if (err instanceof QuotaError) throw err;
                  console.warn(`[translate] gagal (${lang}):`, text, err);
               }
            }

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
            if (err instanceof QuotaError) {
               setState({
                  loading: false,
                  translations: [],
                  error: 'Kuota terjemahan habis. Coba lagi besok.',
                  progress: 0,
               });
               return;
            }
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
   }, [linesKey, targetLang, enabled]);

   return state;
}