import type { LyricsResult } from './lyrics';

const BASE = '/api/lyricsovh';

type OvhResponse = {
   lyrics?: string;
   error?: string;
};

/**
 * lyrics.ovh — plain lyrics saja, tanpa synced.
 * Endpoint: GET /v1/{artist}/{title}
 */
export async function fetchLyricsOvh(
   artist: string,
   title: string
): Promise<LyricsResult | null> {
   if (!artist.trim() || !title.trim()) return null;

   const url = `${BASE}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

   const res = await fetch(url);

   if (!res.ok) return null;

   let data: OvhResponse;
   try {
      data = await res.json();
   } catch {
      return null;
   }

   if (!data.lyrics || data.error) return null;

   // lyrics.ovh kadang kasih prefix "\r\n" dan paragraf kosong — bersihkan
   const cleaned = data.lyrics
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

   if (!cleaned) return null;

   return {
      synced: false,
      lines: cleaned.split('\n').map((text) => ({ time: 0, text })),
      plain: cleaned,
   };
}