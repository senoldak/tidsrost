// SSB veri sayfalarının (/prisstigning/, /boligpriser/, /arbeidsledighet/) ortak parçaları: ay yazımı, eskilik,
// ilgili haberler ve JSON-LD. Rakam üretmez; yalnız src/data/*.json'dakini biçimler.
import { getNews, type Haber } from './news';
import { aktiveTemaer } from './temaer';
import { erGammel } from './data';
import { ORG_ID, SITE_URL, WEBSITE_ID, breadcrumbs } from './seo';

export const GAMMEL_HENTET_MS = 3 * 86_400_000;
export const GAMMEL_MAANED_MS = 45 * 86_400_000;
export const GAMMEL_KVARTAL_MS = 120 * 86_400_000;

const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const MND_KORT = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];

/** '2026-09' → 'september 2026' */
export const maanedTekst = (ym: string) => `${MND[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
/** '2026-09' → 'sep. 26' (grafik ekseni) */
export const maanedKort = (ym: string) => `${MND_KORT[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;
/** '2026K3' → '3. kvartal 2026' */
export const kvartalTekst = (k: string) => `${k.slice(5)}. kvartal ${k.slice(0, 4)}`;
/** '2026K3' → 'K3 26' */
export const kvartalKort = (k: string) => `K${k.slice(5)} ${k.slice(2, 4)}`;

/** Veri eski mi: biz uzun süredir alamadık ya da kaynağın son yayını beklenenden eski. */
export const dataGammel = (hentet: string, oppdatert: string | null | undefined, grense: number) =>
  erGammel(hentet, GAMMEL_HENTET_MS) || (oppdatert ? erGammel(oppdatert, grense) : false);

/** SSB temasındaki haberlerden konuya uyanlar önce, sonra temanın en yenileri; en çok n. */
export async function relaterteSaker(monster: RegExp, n = 4): Promise<Haber[]> {
  const ssb = aktiveTemaer(await getNews()).find((t) => t.tema.slug === 'ssb')?.saker ?? [];
  const treff = ssb.filter((h) => monster.test(`${h.data.title} ${h.data.description ?? ''}`));
  return [...treff, ...ssb.filter((h) => !treff.includes(h))].slice(0, n);
}

/** WebPage + Dataset + BreadcrumbList. */
export function datasideLd(p: {
  url: string;
  tittel: string;
  description: string;
  datasettNavn: string;
  datasettBeskrivelse: string;
  kildeData: string;
  lisensUrl: string;
  periode: string;
  oppdatert: string;
}) {
  const sti = [
    { name: 'Forsiden', url: `${SITE_URL}/` },
    { name: 'Tall og data', url: `${SITE_URL}/tall/` },
    { name: p.tittel, url: p.url },
  ];
  return {
    sti,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${p.url}#page`,
          url: p.url,
          name: p.tittel,
          description: p.description,
          inLanguage: 'nb',
          dateModified: p.oppdatert,
          isPartOf: { '@id': WEBSITE_ID },
          publisher: { '@id': ORG_ID },
          about: { '@type': 'GovernmentOrganization', name: 'Statistisk sentralbyrå', sameAs: 'https://www.wikidata.org/wiki/Q2367019' },
        },
        {
          '@type': 'Dataset',
          '@id': `${p.url}#data`,
          name: p.datasettNavn,
          description: p.datasettBeskrivelse,
          url: p.url,
          inLanguage: 'nb',
          creator: { '@type': 'GovernmentOrganization', name: 'Statistisk sentralbyrå' },
          isBasedOn: p.kildeData,
          license: p.lisensUrl,
          isAccessibleForFree: true,
          spatialCoverage: 'Norge',
          temporalCoverage: p.periode,
          dateModified: p.oppdatert,
        },
        breadcrumbs(sti),
      ],
    },
  };
}
