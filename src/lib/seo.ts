import { SITE } from './site';

// Arama motorları için ortak yapılandırılmış veri (schema.org JSON-LD) ve meta yardımcıları.
export const SITE_URL = 'https://tidsrost.com';
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const OM_OSS = `${SITE_URL}/om-oss/`;
export const REDAKSJONELLE_PRINSIPPER = `${SITE_URL}/redaksjonelle-prinsipper/`;

// Meta description için makul uzunluk (≤160); kelime sınırında kısaltılır. Boşsa site açıklaması.
export function metaDescription(text?: string, max = 160) {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return SITE.description;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(' ');
  return `${(i > 80 ? cut.slice(0, i) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

// Google başlık sınırı: headline ≤110 karakter.
export function headline(title: string, max = 110) {
  return title.length <= max ? title : `${title.slice(0, max - 1).trimEnd()}…`;
}

const sameAs = Object.values(SITE.social).filter(Boolean);

export const organization = {
  '@type': 'NewsMediaOrganization',
  '@id': ORG_ID,
  name: SITE.name,
  url: `${SITE_URL}/`,
  // Haber yayıncısı logosu dikdörtgen, en az 600×60 (sitenin yazı logosundan üretilir: scripts/merke.mjs).
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-600x60.png`, width: 600, height: 60 },
  image: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-512.png`, width: 512, height: 512 },
  ...(sameAs.length ? { sameAs } : {}),
  ...(SITE.epost ? { email: SITE.epost } : {}),
  publishingPrinciples: REDAKSJONELLE_PRINSIPPER,
  ethicsPolicy: REDAKSJONELLE_PRINSIPPER,
  correctionsPolicy: `${SITE_URL}/rettelsespolitikk/`,
  actionableFeedbackPolicy: `${REDAKSJONELLE_PRINSIPPER}#rettelser`,
  inLanguage: 'nb',
  knowsAbout: ['Nyheter', 'Økonomi', 'Samfunn', 'Vær og farevarsler', 'Teknologi'],
};

export const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE.name,
  url: `${SITE_URL}/`,
  inLanguage: 'nb',
  publisher: { '@id': ORG_ID },
};

export function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
