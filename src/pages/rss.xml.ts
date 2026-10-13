import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE, categoryName } from '../lib/site';
import { getNews, newsUrl } from '../lib/news';

export async function GET(context: APIContext) {
  const news = await getNews();
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!,
    items: news.slice(0, 50).map((h) => ({
      title: h.data.title,
      description: h.data.description,
      pubDate: h.data.date,
      link: newsUrl(h),
      categories: [categoryName(h.data.category)],
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>nb</language><atom:link href="${new URL('/rss.xml', context.site).href}" rel="self" type="application/rss+xml"/>`,
  });
}
