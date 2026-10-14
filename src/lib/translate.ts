const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

export type TranslationResult = {
   translated: string;
   detectedSource?: string;
};

/**
 * Deteksi bahasa sumber dari karakter teks.
 * Return kode ISO 2 huruf, atau null kalau tidak yakin.
 */
export function detectSourceLang(text: string): string | null {
   if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko'; // Hangul
   if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';             // Hiragana/Katakana
   if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';                          // Hanzi
   if (/[\u0400-\u04FF]/.test(text)) return 'ru';                          // Cyrillic
   if (/[\u0600-\u06FF]/.test(text)) return 'ar';                          // Arabic
   if (/[\u0E00-\u0E7F]/.test(text)) return 'th';                          // Thai
   if (/[a-zA-Z]/.test(text)) return 'en';                                 // Latin default
   return null;
}

export async function translateLine(
   text: string,
   targetLang: string = 'id'
): Promise<TranslationResult> {
   const detected = detectSourceLang(text);
   const sources = detected
      ? [detected]
      : ['en', 'ko', 'ja', 'zh'];

   let lastErr: Error | null = null;

   for (const src of sources) {
      if (src === targetLang) continue;

      try {
         const langPair = `${src}|${targetLang}`;
         const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

         const res = await fetch(url);
         if (!res.ok) throw new Error(`HTTP ${res.status}`);

         const data = await res.json();
         if (data.responseStatus !== 200) {
            throw new Error(data.responseDetails || 'Translation failed');
         }

         return {
            translated: data.responseData.translatedText,
            detectedSource: src,
         };
      } catch (err) {
         lastErr = err as Error;
      }
   }

   throw lastErr ?? new Error('Translation failed');
}