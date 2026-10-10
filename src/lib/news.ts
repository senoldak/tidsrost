import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES } from './site';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar canlı sitede görünmez, yerel geliştirmede görünür.
export async function getNews(): Promise<Haber[]> {
  const all = await getCollection('haberler', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Menülerde sadece en az bir yayınlanmış haberi olan kategoriler gösterilir;
// boş bir kategoriye ilk haber eklenince menüye kendiliğinden gelir.
export async function getActiveCategories() {
  const used = new Set((await getNews()).map((h) => h.data.category));
  return CATEGORIES.filter((c) => used.has(c.slug));
}

export function newsUrl(haber: Haber) {
  return `/artikkel/${haber.id}/`;
}
