export const SITE = {
  name: 'tidsrøst',
  description: 'Siste nytt fra Norge og verden.',
  locale: 'nb-NO',
  social: {
    x: 'https://x.com/',
    facebook: 'https://facebook.com/',
  },
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
