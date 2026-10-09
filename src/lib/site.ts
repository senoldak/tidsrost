export const SITE = {
  name: 'tidsrøst',
  description: 'Siste nytt fra Norge og verden.',
  locale: 'nb-NO',
  social: {
    x: 'https://x.com/',
    facebook: 'https://facebook.com/',
  },
  // Sorumlu editör ve iletişim; sitenin altbilgisinde ve "Om oss" sayfasında gösterilir.
  // Boş bırakılan alanlar sitede görünmez.
  redaktor: '',
  epost: '',
};

import redaksjon from './redaksjon.json';

// Okura haberin altında gösterilen üretim açıklamaları (VVP 2.3).
// Yapay zekâ etiketleri sadece redaksjon.json'da visKiMerking: true ise gösterilir.
const KI_MERKING: Record<string, string> = {
  'ki-assistert': 'Denne saken er skrevet med hjelp av kunstig intelligens (KI) og kontrollert av redaksjonen før publisering.',
  'ki-kontrollert':
    'Denne saken er skrevet med hjelp av kunstig intelligens (KI) og kontrollert automatisk av KI mot den opprinnelige kilden. Den er ikke kontrollert manuelt før publisering.',
  'ki-automatisk': 'Denne saken er skrevet med hjelp av kunstig intelligens (KI) og publisert automatisk, uten manuell kontroll.',
};

export const PRODUKSJON: Record<string, string> = {
  automatisk: 'Denne saken er laget automatisk på grunnlag av offentlige data, uten manuell redigering.',
  ...(redaksjon.visKiMerking ? KI_MERKING : {}),
};

// Kategori listesi panel ayarlarıyla (public/admin/config.yml) aynı tutulmalı.
export const CATEGORIES = [
  { slug: 'innenriks', name: 'Innenriks' },
  { slug: 'utenriks', name: 'Utenriks' },
  { slug: 'okonomi', name: 'Økonomi' },
  { slug: 'sport', name: 'Sport' },
  { slug: 'kultur', name: 'Kultur' },
  { slug: 'teknologi', name: 'Teknologi' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function formatDate(date: Date, withTime = false) {
  return date.toLocaleString(SITE.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Europe/Oslo',
  });
}
