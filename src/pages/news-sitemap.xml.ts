import type { APIContext } from 'astro';
import { SITE } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';
import { apenForSok } from '../lib/sok-synlighet.mjs';

// Google News site haritası: son 48 saatte yayımlanan haberler (Google'ın sınırı).
// Site her bot commit'inden sonra yeniden derlendiği için derleme anındaki pencere yeterlidir.
// Arama motorlarına kapalı (noindex) haberler girmez; ölçü haber sayfasıyla aynı (src/lib/sok-synlighet.mjs).
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  const limit = Date.now() - 48 * 3600 * 1000;
  const items = (await getNews()).filter((h) => h.data.date.getTime() >= limit && apenForSok({ body: h.body, produksjon: h.data.produksjon, id: h.id, title: h.data.title })).slice(0, 1000);
  const urls = items
    .map(
      (h) => `  <url>
    <loc>${esc(new URL(newsUrl(h), context.site).href)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE.name)}</news:name>
        <news:language>nb</news:language>
      </news:publication>
      <news:publication_date>${h.data.date.toISOString()}</news:publication_date>
      <news:title>${esc(h.data.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
