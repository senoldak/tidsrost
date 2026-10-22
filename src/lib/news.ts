import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, dayBand } from './site';

export type Haber = CollectionEntry<'haberler'>;

// Taslaklar ve tarihi gelmemiş (planlanmış) haberler canlı sitede görünmez, yerel geliştirmede görünür.
// Planlanmış haberler, mecmua-saat'in her sabah 07:00'de (Oslo) başlattığı derlemeyle yayına girer.
export function yayinda(data: { draft: boolean; date: Date }) {
  return !data.draft && data.date.getTime() <= Date.now();
}

export async function getNews(): Promise<Haber[]> {
  const all = await getCollection('haberler', ({ data }) => import.meta.env.DEV || yayinda(data));
  return all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Menülerde sadece en az bir yayınlanmış haberi olan kategoriler gösterilir;
// boş bir kategoriye ilk haber eklenince menüye kendiliğinden gelir.
export async function getActiveCategories() {
  const used = new Set((await getNews()).map((h) => h.data.category));
  return CATEGORIES.filter((c) => used.has(c.slug));
}

// "Forklart" bölümü: tablo ve grafiklerle açıklayıcı yazılar.
export const FORKLART = { slug: 'forklart', name: 'Forklart' } as const;
export const erForklart = (h: Haber) => h.data.sjanger === 'forklart';

// Yazar sayfası adresi; sitenin kendi adıyla (bot) yayımlanan haberlerin yazar sayfası yoktur.
export function forfatterSlug(navn: string) {
  return navn
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function newsUrl(haber: Haber) {
  return `/artikkel/${haber.id}/`;
}

// Haberin sonundaki "*Kilde: [Ad](link)*" satırından kaynağın adını okur; listelerde gösterilir.
export function kilde(haber: Haber) {
  return haber.body?.match(/\*Kilde:\s*\[([^\]]+)\]/)?.[1];
}

// Aynı satırın bağlantısı (yalnız https). Bot bu satırı yalnız offentlig kilde için yazar; medya haberinde satır yoktur.
export function kildeUrl(haber: Haber) {
  return haber.body?.match(/\*Kilde:\s*\[[^\]]+\]\((https:\/\/[^\s)]+)\)/)?.[1];
}

// Haberleri gün bantlarına ayırır: I dag, I går, Tidligere (anasayfa ve kategori sayfaları).
export function groupByDay(news: Haber[]) {
  const bands = new Map<string, Haber[]>();
  for (const h of news) {
    const key = dayBand(h.data.date);
    bands.set(key, [...(bands.get(key) ?? []), h]);
  }
  return [...bands].map(([label, items]) => ({ label, items }));
}
