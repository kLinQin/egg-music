const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

export class QuotaError extends Error {
   constructor() {
      super('Kuota terjemahan habis. Coba lagi besok.');
      this.name = 'QuotaError';
   }
}

export type TranslationResult = {
   translated: string;
   detectedSource?: string;
};

export function detectSourceLang(text: string): string | null {
   if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko';
   if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
   if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
   if (/[\u0400-\u04FF]/.test(text)) return 'ru';
   if (/[\u0600-\u06FF]/.test(text)) return 'ar';
   if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
   if (/[a-zA-Z]/.test(text)) return 'en';
   return null;
}

export async function translateLine(
   text: string,
   targetLang: string = 'id'
): Promise<TranslationResult> {
   const detected = detectSourceLang(text);
   const sources = detected ? [detected] : ['en', 'ko', 'ja', 'zh'];

   let lastErr: Error | null = null;

   for (const src of sources) {
      if (src === targetLang) continue;

      try {
         const langPair = `${src}|${targetLang}`;
         const params = new URLSearchParams({
            q: text,
            langpair: langPair,
         });
         const url = `${MYMEMORY_URL}?${params.toString()}`;

         const res = await fetch(url);

         if (res.status === 429) {
            throw new QuotaError();
         }

         if (!res.ok) throw new Error(`HTTP ${res.status}`);

         const data = await res.json();
         if (data.responseStatus !== 200) {
            const detail = data.responseDetails || 'Translation failed';
            if (/quota|limit/i.test(detail)) throw new QuotaError();
            throw new Error(detail);
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