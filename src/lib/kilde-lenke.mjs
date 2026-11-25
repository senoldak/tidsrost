// Kilde-linjer under grafer og i Forklart/Analyse: navn på offentlige etater og statistikkbyråer blir lenker
// ("tonla veri kaynağı kullanıyoruz ama link vermiyoruz", 25. november 2026). Bare etatene i denne listen lenkes;
// mediehus står aldri her (de vises bare i sakens kildeliste, src/components/artikkel/Kilder.astro).
// "SSB, tabell 06752" → tabellnummeret lenkes til Statistikkbanken.
//
// kildeDeler(tekst) -> [{ tekst, url? }]: hele teksten i rekkefølge; samme adresse lenkes én gang.

// Lengste navn først: "Statistisk sentralbyrå" før "SSB" spiller ingen rolle, men "Meteorologisk institutt" før "MET".
export const ETATER = [
  ['Kultur- og likestillingsdepartementet', 'https://www.regjeringen.no/no/dep/kud/'],
  ['Kunnskapsdepartementet', 'https://www.regjeringen.no/no/dep/kd/'],
  ['Finansdepartementet', 'https://www.regjeringen.no/no/dep/fin/'],
  ['Utdanningsdirektoratet', 'https://www.udir.no/'],
  ['Statistisk sentralbyrå', 'https://www.ssb.no/'],
  ['Meteorologisk institutt', 'https://www.met.no/'],
  ['Konkurransetilsynet', 'https://konkurransetilsynet.no/'],
  ['Helsedirektoratet', 'https://www.helsedirektoratet.no/'],
  ['Sokkeldirektoratet', 'https://www.sodir.no/'],
  ['Europakommisjonen', 'https://commission.europa.eu/'],
  ['Statens vegvesen', 'https://www.vegvesen.no/'],
  ['Mattilsynet', 'https://www.mattilsynet.no/'],
  ['Norges Bank', 'https://www.norges-bank.no/'],
  ['Lånekassen', 'https://lanekassen.no/'],
  ['Husbanken', 'https://www.husbanken.no/'],
  ['regjeringen', 'https://www.regjeringen.no/'],
  ['Lovdata', 'https://lovdata.no/'],
  ['Udir', 'https://www.udir.no/'],
  ['Nav', 'https://www.nav.no/'],
  ['NVE', 'https://www.nve.no/'],
  ['SSB', 'https://www.ssb.no/'],
  ['MET', 'https://www.met.no/'],
];

const kapp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BOKSTAV = 'A-Za-z0-9ÆØÅæøåÉé';
// Gruppe 1: etat; gruppe 2: SSB-tabellnummer ("tabell 06752").
const MONSTER = new RegExp(`(?<![${BOKSTAV}])(?:(${ETATER.map(([n]) => kapp(n)).join('|')})|tabell (\\d{5}))(?![${BOKSTAV}])`, 'g');
const ADRESSE = new Map(ETATER);

export function kildeDeler(tekst) {
  const s = String(tekst ?? '');
  const deler = [];
  const lenket = new Set();
  let ssb = false;
  let slutt = 0;
  for (const m of s.matchAll(MONSTER)) {
    let url;
    let navn;
    let start;
    if (m[1]) {
      navn = m[1];
      start = m.index;
      url = ADRESSE.get(navn);
      if (url === 'https://www.ssb.no/') ssb = true;
      if (lenket.has(url)) continue;
      lenket.add(url);
    } else {
      // Tabellnummer lenkes bare når SSB er nevnt før i samme linje; bare tallet blir lenke.
      if (!ssb) continue;
      navn = m[2];
      start = m.index + m[0].length - navn.length;
      url = `https://www.ssb.no/statbank/table/${navn}`;
    }
    if (start > slutt) deler.push({ tekst: s.slice(slutt, start) });
    deler.push({ tekst: navn, url });
    slutt = start + navn.length;
  }
  if (slutt < s.length) deler.push({ tekst: s.slice(slutt) });
  return deler;
}

/** Kildelinjens HTML: teksten escapet, etatsnavn lenket. esc: HTML-escape. */
export const kildeHtml = (tekst, esc) =>
  kildeDeler(tekst).map((d) => (d.url ? `<a href="${esc(d.url)}">${esc(d.tekst)}</a>` : esc(d.tekst))).join('');
