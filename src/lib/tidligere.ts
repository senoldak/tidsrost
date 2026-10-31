// «Tidligere i saken»: eldre saker som handler om samme hendelse som denne saken.
// Samme hendelse = minst to felles viktige ord i tittel + ingress (sammeHendelse, src/lib/kilde-relevans.mjs) og i tillegg:
//  - begge sakene har anlamsvektor (src/data/vektorler.jsonl): anlamslikhet på minst ANLAM_MIN, uansett kategori
//    (samme hendelse kan stå i innenriks og utenriks);
//  - mangler vektor: samme kategori, minst tre felles ord og minst ett felles egennavn (enheter()).
// Gjentagende serier (Farevarsler, datadrevne automatiske saker, Forklart/Analyse) og samlinger (nyheter-*, Kort fortalt)
// regnes aldri som tidligere saker: de deler ord uten å være samme hendelse. Sortert fra eldst til nyest; tomt = ingen seksjon.
import { enheter } from '../../scripts/nyheter/dublett.mjs';
import { anlamBenzerligi, vektorleriOku } from './anlam.mjs';
import { viktigeOrd, ordSamvar } from './kilde-relevans.mjs';
import { erSammendrag } from './relaterte.ts';
import type { Haber } from './news.ts';

export const TIDLIGERE_MAKS = 4;
export const ANLAM_MIN = 0.8;
const MIN_ORD = 2;
const MIN_ORD_UTEN_ANLAM = 3;

export type AnlamFn = (a: Haber, b: Haber) => number | null;
const varsayilanAnlam: AnlamFn = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

const tekstAv = (h: Haber) => `${h.data.title}\n${String(h.data.description ?? '').slice(0, 300)}`;
const erTall = (t: string) => /^\d+$/.test(t);

const erSerie = (h: Haber) =>
  /^Farevarsler\b/i.test(h.data.title) || /automatisk/.test(h.data.produksjon ?? '') || (h.data.sjanger ?? 'nyhet') !== 'nyhet';
const erSamling = (h: Haber) => /^nyheter-/.test(h.id) || erSammendrag(h);

/** Antall felles viktige ord (tall regnes ikke: årstall og beløp skiller ikke hendelser). */
function fellesOrd(a: Haber, b: Haber): number {
  const y = [...viktigeOrd(tekstAv(b))].filter((t) => !erTall(t));
  const brukt = new Set<string>();
  let n = 0;
  for (const x of viktigeOrd(tekstAv(a))) {
    if (erTall(x)) continue;
    const m = y.find((z) => !brukt.has(z) && ordSamvar(x, z));
    if (m) {
      brukt.add(m);
      n++;
    }
  }
  return n;
}

function fellesNavn(a: Haber, b: Haber): number {
  const bn = new Set<string>(enheter(`${b.data.title}. ${b.data.description ?? ''}`) as Set<string>);
  return [...(enheter(`${a.data.title}. ${a.data.description ?? ''}`) as Set<string>)].filter((t) => !erTall(t) && bn.has(t)).length;
}

function sammeSak(a: Haber, b: Haber, anlam: AnlamFn): boolean {
  const ord = fellesOrd(a, b);
  if (ord < MIN_ORD) return false;
  const sim = anlam(a, b);
  if (sim !== null && sim !== undefined) return sim >= ANLAM_MIN;
  return a.data.category === b.data.category && ord >= MIN_ORD_UTEN_ANLAM && fellesNavn(a, b) >= 1;
}

export function tidligereSaker(sak: Haber, alle: Haber[], maks = TIDLIGERE_MAKS, anlam: AnlamFn = varsayilanAnlam): Haber[] {
  if (erSerie(sak) || erSamling(sak)) return [];
  const dato = sak.data.date.getTime();
  const funnet = alle
    .filter((h) => h.id !== sak.id && h.data.date.getTime() < dato && !erSamling(h) && !erSerie(h) && sammeSak(sak, h, anlam))
    // De nyeste av de eldre kommer med når det er flere enn maks; visningen er eldst først.
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
    .slice(0, Math.max(0, maks));
  return funnet.reverse();
}
