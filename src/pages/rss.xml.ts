import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { SITE, categoryName, gorselVar } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export async function GET(context: APIContext) {
  const news = await getNews();
  const items = await Promise.all(
    news.slice(0, 50).map(async (h) => {
      const cover = gorselVar(h.data.date) ? h.data.cover : undefined;
      const ogWidth = cover ? Math.min(1200, cover.width) : undefined;
      const img = cover && ogWidth ? await getImage({ src: cover, width: ogWidth, format: 'jpeg' }) : undefined;
      const media = img
        ? `<media:content url="${xml(new URL(img.src, context.site).href)}" medium="image" type="image/jpeg" width="${img.attributes.width}" height="${img.attributes.height}" />`
        : undefined;
      return {
        title: h.data.title,
        description: h.data.description,
        pubDate: h.data.date,
        link: newsUrl(h),
        categories: [categoryName(h.data.category), ...(h.data.sjanger === 'forklart' ? ['Forklart'] : [])],
        ...(media ? { customData: media } : {}),
      };
    }),
  );
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom', media: 'http://search.yahoo.com/mrss/' },
    items,
    customData: `<language>nb</language><atom:link href="${new URL('/rss.xml', context.site).href}" rel="self" type="application/rss+xml" />`,
  });
}
