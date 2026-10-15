import { GoogleTranslatorTokenFree } from 'anylang/translators/GoogleTranslator';
import {
   basicFetcher,
   type Fetcher,
   type FetcherOptions,
   type FetcherRequestType,
   type FetcherResponse,
   type FetcherResponseDataByTypeMap,
} from 'anylang/utils';

export type TranslationResult = {
   translated: string;
   detectedSource?: string;
};

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

/**
 * Custom fetcher — request ke anylang diarahkan ke Vite proxy.
 */
const proxyFetcher: Fetcher = <T extends FetcherRequestType>(
   url: string,
   options: FetcherOptions<T>
): Promise<FetcherResponse<FetcherResponseDataByTypeMap[T]>> => {
   const proxiedUrl = url.replace(
      /^https?:\/\/translate\.googleapis\.com/,
      '/api/gtranslate'
   );

   return basicFetcher(proxiedUrl, options);
};

let translator: GoogleTranslatorTokenFree | null = null;

function getTranslator(): GoogleTranslatorTokenFree {
   if (!translator) {
      translator = new GoogleTranslatorTokenFree({
         fetcher: proxyFetcher,
      });
   }
   return translator;
}

export async function translateGoogle(
   text: string,
   targetLang: string = 'id',
   sourceLang?: string
): Promise<TranslationResult> {
   const trimmed = text.trim();
   if (!trimmed) return { translated: '' };

   const sl = sourceLang ?? detectSourceLang(trimmed) ?? 'auto';

   const result = await getTranslator().translate(trimmed, sl, targetLang);

   return { translated: result };
}

export async function translateGoogleBatch(
   texts: string[],
   targetLang: string = 'id',
   sourceLang?: string
): Promise<string[]> {
   if (texts.length === 0) return [];

   const first = texts.find((t) => t.trim());
   if (!first) return texts.map(() => '');

   const sl = sourceLang ?? detectSourceLang(first) ?? 'auto';

   const results = await getTranslator().translateBatch(texts, sl, targetLang);

   return results.map((r) => r ?? '');
}