export const SITE = {
  name: 'tidsrøst',
  description: 'Siste nytt fra Norge og verden.',
  locale: 'nb-NO',
  // Sosyal medya hesapları; boş bırakılan link sitede görünmez.
  // Hesap açılınca tam adresi yaz (ör. 'https://x.com/tidsrost').
  social: {
    x: '',
    facebook: '',
  },
  // Sorumlu editör ve iletişim; sitenin altbilgisinde ve "Om oss" sayfasında gösterilir.
  // Boş bırakılan alanlar sitede görünmez.
  redaktor: '',
  epost: 'redaksjon@tidsrost.com',
  // Yayıncı; şirket kurulursa adı ve organizasyon numarası buraya yazılır.
  utgiver: '',
  orgnr: '',
  // Sitenin gelir getirmediği açıkça belirtilir (altbilgi ve "Om oss").
  ikkeKommersiell: true,
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

export function formatTime(date: Date) {
  return date.toLocaleTimeString(SITE.locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' });
}

export function formatDay(date: Date) {
  const s = date.toLocaleDateString(SITE.locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Haberin üretim şekli için kısa işaret; sadece okura açıklama gösterilen türler için (PRODUKSJON).
export function produksjonMerke(produksjon: string) {
  if (!PRODUKSJON[produksjon]) return undefined;
  return produksjon === 'automatisk' ? { kind: 'automatisk', label: 'Automatisk' } : { kind: 'ki', label: 'KI' };
}

// MET/NVE farevarsel'leri başlıktan tanınır; seviye rengi işarette gösterilir.
export function varsel(title: string) {
  const m = title.match(/^(gult|oransje|rødt)\b.*(farevarsel|varsel)/i);
  if (!m) return undefined;
  const level = m[1].toLowerCase().replace('ø', 'o');
  return { level, label: `${m[1].charAt(0).toUpperCase()}${m[1].slice(1).toLowerCase()} farevarsel` };
}

// Gün bantları: derleme gününe göre "I dag", "I går", sonra "Tidligere".
export function dayBand(date: Date) {
  const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (day(date) === day(today)) return 'I dag';
  if (day(date) === day(yesterday)) return 'I går';
  return 'Tidligere';
}
