const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

export type TranslationResult = {
   translated: string;
   detectedSource?: string;
};

export class QuotaError extends Error {
   constructor(message = 'Terjemahan quota habis') {
      super(message);
      this.name = 'QuotaError';
   }
}

const FALLBACK_SOURCES = ['en', 'ko', 'ja', 'zh', 'id'];

export async function translateLine(
   text: string,
   targetLang: string = 'id'
): Promise<TranslationResult> {
   const trimmed = text.trim();
   if (!trimmed) return { translated: '' };

   const sources = targetLang === 'en' ? ['en'] : FALLBACK_SOURCES;
   let lastErr: Error | null = null;

   for (const src of sources) {
      if (src === targetLang) continue;

      try {
         const langPair = `${src}|${targetLang}`;
         const url = `${MYMEMORY_URL}?q=${encodeURIComponent(trimmed)}&langpair=${langPair}`;

         const res = await fetch(url);
         if (!res.ok) throw new Error(`HTTP ${res.status}`);

         const data = await res.json();

         if (data.responseStatus === 403) {
            throw new QuotaError();
         }
         if (data.responseStatus !== 200) {
            throw new Error(data.responseDetails || 'Translation failed');
         }

         return {
            translated: data.responseData.translatedText,
            detectedSource: src,
         };
      } catch (err) {
         if (err instanceof QuotaError) throw err;
         lastErr = err as Error;
      }
   }

   throw lastErr ?? new Error('Translation failed');
}