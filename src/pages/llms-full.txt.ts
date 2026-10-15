import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { yayinda } from '../lib/news';
import { SITE_URL } from '../lib/seo';
import { categoryName } from '../lib/site';
import { kilde } from '../lib/news';

export const prerender = true;

export const GET: APIRoute = async () => {
  const allNews = await getCollection('haberler', ({ data }) => yayinda(data));
  const sorted = allNews.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const top40 = sorted.slice(0, 40);

  let output = `# tidsrøst - Full Content Feed (llms-full.txt)\n\n`;
  output += `> Siste nytt fra Norge og verden.\n\n`;
  output += `Last updated / Sist oppdatert: ${new Date().toISOString()}\n\n`;

  for (const haber of top40) {
    const url = `${SITE_URL}/artikkel/${haber.id}/`;
    const dateStr = haber.data.date.toISOString().split('T')[0];
    const category = categoryName(haber.data.category);
    const source = kilde(haber);

    output += `## ${haber.data.title}\n`;
    output += `- URL: ${url}\n`;
    output += `- Dato / Date: ${dateStr}\n`;
    output += `- Kategori / Category: ${category}\n`;
    if (haber.data.description) {
      output += `- Ingress / Summary: ${haber.data.description}\n`;
    }
    if (source) {
      output += `- Kilde / Source: ${source}\n`;
    }
    if (haber.data.why_matters) {
      output += `- Hvorfor saken er viktig: ${haber.data.why_matters}\n`;
    }
    if (haber.data.key_points && haber.data.key_points.length > 0) {
      output += `- Viktige punkter: ${haber.data.key_points.join('; ')}\n`;
    }
    output += `\n`;
  }

  return new Response(output, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
