// Haftalık ukesbrev içeriği (worker/bulten.mjs okur). Derlemede üretilir; her derleme "son 7 gün"ü yeniden hesaplar.
// Yalnız indekslenebilir (noindex olmayan) haberler girer; yazı başlığı, ingress, mutlak adres ve tarih taşınır.
// Kaynak adı, besleme adresi ya da gizli kayıt alanı (kildeSpor) bu dosyaya girmez.
import type { APIRoute } from 'astro';
import { erForklart, getNews, newsUrl } from '../../lib/news';
import { SITE_URL } from '../../lib/seo';
import { indekserbar } from '../../lib/ordtelling.mjs';

export const prerender = true;

const GUN_MS = 86_400_000;
const HABER_MAKS = 10;
const FORKLART_MAKS = 5;

export const GET: APIRoute = async () => {
  const simdi = Date.now();
  const fra = simdi - 7 * GUN_MS;
  const son = (await getNews()).filter((h) => h.data.date.getTime() >= fra && indekserbar(h.body));
  const oge = (h: (typeof son)[number]) => ({
    tittel: h.data.title,
    ingress: h.data.description,
    url: new URL(newsUrl(h), SITE_URL).href,
    dato: h.data.date.toISOString(),
  });
  const json = {
    generert: new Date(simdi).toISOString(),
    haberler: son.filter((h) => !erForklart(h)).slice(0, HABER_MAKS).map(oge),
    forklart: son.filter(erForklart).slice(0, FORKLART_MAKS).map(oge),
  };
  return new Response(JSON.stringify(json, null, 2), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
