export type TranslationResult = {
   translated: string;
   detectedSource?: string;
};

const BASE = '/api/gtranslate';

type GTranslateResponse = [
   // [0] = array of segments
   Array<[string, string, unknown, unknown, unknown] | null>,
   // [1] = detected source language
   string | null,
   // ...
   ...unknown[]
];

/**
 * Deteksi bahasa sumber dari karakter teks.
 */
function detectSourceLang(text: string): string | null {
   if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko';
   if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
   if (/[\u4E00-\u9FFF]/.test(text)) return 'zh-CN';
   if (/[\u0400-\u04FF]/.test(text)) return 'ru';
   if (/[\u0600-\u06FF]/.test(text)) return 'ar';
   if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
   return null;
}

export async function translateGoogle(
   text: string,
   targetLang: string = 'id',
   sourceLang?: string
): Promise<TranslationResult> {
   const trimmed = text.trim();
   if (!trimmed) return { translated: '' };

   const sl = sourceLang ?? detectSourceLang(trimmed) ?? 'auto';

   const params = new URLSearchParams({
      client: 'gtx',
      sl,
      tl: targetLang,
      dt: 't',
      q: trimmed,
   });

   const url = `${BASE}/translate_a/single?${params.toString()}`;

   const res = await fetch(url);
   if (!res.ok) {
      throw new Error(`Google Translate HTTP ${res.status}`);
   }

   const data = (await res.json()) as GTranslateResponse;

   if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Format response tidak valid');
   }

   const segments = data[0];
   const translated = segments
      .filter((s): s is [string, string, unknown, unknown, unknown] => Array.isArray(s) && s[0] != null)
      .map((s) => s[0])
      .join('');

   if (!translated) {
      throw new Error('Terjemahan kosong');
   }

   return {
      translated,
      detectedSource: typeof data[1] === 'string' ? data[1] : undefined,
   };
}