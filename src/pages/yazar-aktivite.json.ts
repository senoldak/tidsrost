// Sahibin bu sitedeki imzalı yazılarının yayın tarihleri: [{ site, date }]. Diğer üç site yazar sayfasındaki gün ızgarası
// için bunu derlemede çeker (scripts/yazar-aktivite.mjs). Yalnız tarih ve site; başlık ya da adres yok.
import { SITE } from '../lib/site';
import { getNews } from '../lib/news';

export async function GET() {
  const poster = (await getNews())
    .filter((h) => h.data.author === SITE.redaktor)
    .map((h) => ({ site: 'tidsrost', date: h.data.date.toISOString() }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
