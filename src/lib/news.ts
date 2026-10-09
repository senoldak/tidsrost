import { getCollection, type CollectionEntry } from 'astro:content';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar canlı sitede görünmez, yerel geliştirmede görünür.
export async function getNews(): Promise<Haber[]> {
  const all = await getCollection('haberler', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function newsUrl(haber: Haber) {
  return `/artikkel/${haber.id}/`;
}
