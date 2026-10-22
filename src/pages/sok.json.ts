// Søkeindeks for nettstedet: tittel, ingress, kategori, adresse og dato for hver artikkel (se src/lib/arama-cekirdek.mjs).
// Lages ved bygging; søkesiden (/sok/) laster den i nettleseren.
import { getNews, newsUrl } from '../lib/news';
import { categoryName } from '../lib/site';

export async function GET() {
  const poster = (await getNews()).map((h) => ({
    t: h.data.title,
    d: h.data.description,
    k: categoryName(h.data.category),
    u: newsUrl(h),
    z: h.data.date.toISOString(),
  }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
