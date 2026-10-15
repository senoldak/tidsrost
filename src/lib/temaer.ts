// Tema sayfaları için derleme yardımcıları (tema listesi ve eşleme kuralı: src/lib/tema.mjs).
// Toplu listeler (Kort fortalt, bültenler) ve kısa (noindex) haberler temalara girmez (bkz. relaterte.ts kanRelateres).
import { MIN_SAKER, TEMAER, temaerFor } from './tema.mjs';
import { NORWEGIAN_ENTITIES } from './entities';
import { kanRelateres } from './relaterte';
import { SITE_URL } from './seo';
import type { Haber } from './news';

export interface Tema {
  slug: string;
  navn: string;
  intro: string;
  entitet?: string;
}

export interface TemaMedSaker {
  tema: Tema;
  saker: Haber[];
}

export const temaUrl = (slug: string) => `/tema/${slug}/`;

/** Sayfası olan temalar (en az MIN_SAKER haber), haberleri yeniden eskiye; tema adına göre sıralı. */
// Her sayfa (menü) bunu çağırır; aynı haber listesi için sonuç bir kez hesaplanır.
let onbellek: { anahtar: string; deger: TemaMedSaker[] } | undefined;

export function aktiveTemaer(news: Haber[]): TemaMedSaker[] {
  const anahtar = news.map((h) => h.id).join('|');
  if (onbellek?.anahtar === anahtar) return onbellek.deger;
  const deger = beregn(news);
  onbellek = { anahtar, deger };
  return deger;
}

function beregn(news: Haber[]): TemaMedSaker[] {
  const per = new Map<string, Haber[]>();
  for (const h of news) {
    if (!kanRelateres(h)) continue;
    for (const slug of temaerFor({ title: h.data.title, description: h.data.description, body: h.body ?? '' })) {
      (per.get(slug) ?? per.set(slug, []).get(slug)!).push(h);
    }
  }
  return (TEMAER as Tema[])
    .map((tema) => ({ tema, saker: per.get(tema.slug) ?? [] }))
    .filter((t) => t.saker.length >= MIN_SAKER)
    .sort((a, b) => a.tema.navn.localeCompare(b.tema.navn, 'nb'));
}

/** Haber id → sayfası olan temaları (haber sayfasındaki "Emner" satırı için). */
export function temaerPerSak(aktive: TemaMedSaker[]): Map<string, Tema[]> {
  const kart = new Map<string, Tema[]>();
  for (const { tema, saker } of aktive) for (const h of saker) (kart.get(h.id) ?? kart.set(h.id, []).get(h.id)!).push(tema);
  return kart;
}

/** Temanın schema.org karşılığı; Wikidata bağlantısı yalnızca entities.ts'te doğrulanmış kayıt varsa. */
export function temaEntitet(tema: Tema) {
  const e = tema.entitet ? NORWEGIAN_ENTITIES.find((x) => x.name === tema.entitet) : undefined;
  return {
    '@type': e?.type ?? 'Organization',
    name: tema.navn,
    ...(e ? { sameAs: e.sameAs } : {}),
  };
}

export const temaAbsUrl = (slug: string) => `${SITE_URL}${temaUrl(slug)}`;
