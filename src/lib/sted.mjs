// Stedet en sak handler om: finnes i tittel eller ingress, matches som helt ord (norske bokstaver) mot stedslisten
// botens kartkode allerede bruker (scripts/nyheter/bilde.mjs STEDER). Bare tittel og ingress teller: et sted som
// bare nevnes inne i teksten er sjelden poenget. Kartet vises bare når stedet er selve saken (visKart).

// Fylke for byene i stedslisten (15 fylker, 2024-inndelingen). Svalbard og Jan Mayen har ikke fylke.
export const FYLKE_FOR = {
  Oslo: 'Oslo', Bergen: 'Vestland', Trondheim: 'Trøndelag', Stavanger: 'Rogaland', Kristiansand: 'Agder',
  Tromsø: 'Troms', Bodø: 'Nordland', Ålesund: 'Møre og Romsdal', Alta: 'Finnmark', Drammen: 'Buskerud',
  Fredrikstad: 'Østfold', Skien: 'Telemark', Haugesund: 'Rogaland', Lillehammer: 'Innlandet', Hamar: 'Innlandet',
  Førde: 'Vestland', Molde: 'Møre og Romsdal', Kristiansund: 'Møre og Romsdal', Røros: 'Trøndelag',
  Steinkjer: 'Trøndelag', Namsos: 'Trøndelag', Brønnøysund: 'Nordland', Sandnessjøen: 'Nordland',
  'Mo i Rana': 'Nordland', Svolvær: 'Nordland', Narvik: 'Nordland', Harstad: 'Troms', Finnsnes: 'Troms',
  Hammerfest: 'Finnmark', Honningsvåg: 'Finnmark', Vadsø: 'Finnmark', Vardø: 'Finnmark', Kirkenes: 'Finnmark',
  Karasjok: 'Finnmark', Kautokeino: 'Finnmark',
};

const BOKSTAV = '\\p{L}\\p{N}';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// «Oslo Børs», «OsloMet» o.l. er navn på institusjoner, ikke et sted der noe skjer.
const INSTITUSJON = /\b(?:Oslo Børs|Oslobørsen|Oslo Met|Oslo Economics|Bergen Næringsråd|Bergen Offshore)\b/giu;

function treff(tekst, sted) {
  const re = new RegExp(`(?<![${BOKSTAV}])${esc(sted.navn)}(?:s)?(?![${BOKSTAV}])`, 'u');
  const m = re.exec(tekst);
  return m ? m.index : -1;
}

/** Samlesaker («… og 4 andre saker»), farevarselsamlinger og analyser handler ikke om ett sted. */
export function kanHaSted(sak) {
  if (/^nyheter-|^farevarsler-/.test(String(sak?.id ?? ''))) return false;
  if (/ og \d+ (?:andre saker|annen sak)\b/u.test(String(sak?.title ?? ''))) return false;
  return sak?.sjanger !== 'forklart' && sak?.sjanger !== 'analyse';
}

/**
 * Stedet saken handler om, ellers null. Tittel går foran ingress; i samme felt velges det mest spesifikke
 * (en mindre by foran en storby), ellers det som nevnes først. Utenlandske steder (naboland) telles ikke.
 * @returns {{navn: string, lat: number, lon: number, fylke?: string} | null}
 */
export function finnSted(tittel, ingress, steder) {
  const liste = (steder ?? []).filter((s) => s && !s.naboland);
  for (const felt of [tittel, ingress]) {
    const tekst = String(felt ?? '').replace(INSTITUSJON, ' ');
    const funnet = liste
      .map((s) => ({ s, pos: treff(tekst, s) }))
      .filter((t) => t.pos >= 0)
      .sort((a, b) => Number(!!a.s.stor) - Number(!!b.s.stor) || a.pos - b.pos);
    if (funnet.length) {
      const { navn, lat, lon, fylke } = funnet[0].s;
      const f = fylke ?? FYLKE_FOR[navn];
      return { navn, lat, lon, ...(f ? { fylke: f } : {}) };
    }
  }
  return null;
}

// Hendelser der stedet er poenget: vær og farevarsel, flom og skred, ulykker, branner og andre lokale hendelser.
// Rene stammer (brann → brannen, brannvesenet), så sammensetninger som «bilbrann» tas med.
const HENDELSE = new RegExp(
  [
    'farevarsel', 'varsel(?:et)? (?:om|for)', 'ekstremvær', 'uvær', 'storm', 'orkan', 'kuling', 'snøfall', 'snøstorm',
    'regnvær', 'styrtregn', 'flom', 'oversvøm', 'skred', 'steinsprang', 'rasfare', 'ras (?:på|i|ved|over)', 'isgang',
    'brann', 'brant', 'ulykke', 'kollisjon', 'kolliderte', 'utforkjøring', 'avsporing', 'avsporet', 'havari',
    'forlis', 'forlist', 'grunnstøtt', 'eksplosjon', 'jordskjelv', 'evakuer', 'drukn', 'savnet', 'omkom',
    'påkjørt', 'veien stengt', 'stengt etter', 'strømbrudd', 'vannforbruk', 'vannmangel', 'kokevarsel', 'bomb(?:e|et)trussel', 'skyting', 'skutt',
  ].map((s) => `(?<![\\p{L}])${s}`).join('|'),
  'iu',
);

/**
 * Vises kart? Bare når saken har et sted og tittelen (eller ingressen) beskriver en hendelse der stedet er selve
 * poenget. Forklart- og analysetekster, samlesaker og saker uten sted får aldri kart; de får bare «◉ sted» i kunyen.
 */
export function visKart(sak) {
  if (!sak?.sted?.navn) return false;
  if (!kanHaSted(sak)) return false;
  if (sak.category && sak.category !== 'innenriks') return false; // «Brann» (fotball), børs, kultur: ikke kart
  return HENDELSE.test(String(sak.title ?? '')) || HENDELSE.test(String(sak.description ?? sak.ingress ?? ''));
}
