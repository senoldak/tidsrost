// Kilde-relevans: en sak får bare oppgis (og telle) som kilde hvis den faktisk handler om samme hendelse.
// Gemini-grupperingen (scripts/nyheter/kilder/medier.mjs) kan feilgruppere urelaterte overskrifter; dette er den
// deterministiske kontrollen etter den. To bruksmåter:
//  - botten: relevanteSaker(saker) på overskrift + ingress (samme hendelse = minst to felles viktige ord)
//  - opprydding av eldre saker: urelatertUrl(url, sakstekst) på ordene i adressen (kun URL finnes)

const STOPP = new Set(
  `og i på til for av med om etter fra som er en et ei den det de dem har hadde vil kan skal ved mot over under ut inn
  seg sin sitt sine ny nye nytt flere mer mest nå ikke men også blir ble bli får fikk gir ga sier sa at alle dette
  denne disse slik hva når hvor hvorfor kommer kom går gikk ta tar tok før enn eller bare både mellom rundt uten
  sammen igjen fortsatt allerede mange noen andre første siste høy høyere lav lavere år uke dag dager
  måned prosent millioner milliarder kroner tusen the and of to in www html nyheter sport sak saken saker
  norge norsk norske norges land lande landet byen verden mener viser foran ifølge han hun ham hans hennes fem seks sju åtte tre fire`.split(/\s+/),
);

// æ/ø/å skrives i URL-er som ae/o|oe/a|aa; begge former beholdes i ordmengden.
const translit = (o, oe) =>
  o
    .replace(/æ/g, 'ae')
    .replace(/ø/g, oe ? 'oe' : 'o')
    .replace(/å/g, oe ? 'aa' : 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[öô]/g, 'o')
    .replace(/ä/g, 'ae')
    .replace(/ü/g, 'u');
function varianter(o) {
  const v = new Set([translit(o, false)]);
  if (/[øå]/.test(o)) v.add(translit(o, true));
  return v;
}

const EKLER = ['ene', 'ens', 'ets', 'ert', 'te', 'en', 'et', 'er', 'a', 'e', 's'];
function stamme(o) {
  if (/\d/.test(o) || o.length < 5) return o;
  for (const e of EKLER) if (o.endsWith(e) && o.length - e.length >= 4) return o.slice(0, -e.length);
  return o;
}

/** Viktige ord (små bokstaver, uten stoppord, lett stammet, med æøå-varianter). Tall på 2+ sifre teller. */
export function viktigeOrd(tekst = '') {
  const ut = new Set();
  for (const r of String(tekst).toLowerCase().match(/\d+|\p{L}+/gu) ?? []) {
    if (/^\d+$/.test(r)) {
      if (r.length >= 2) ut.add(r);
      continue;
    }
    if (r.length < 3 || STOPP.has(r)) continue;
    for (const v of varianter(stamme(r))) ut.add(v);
  }
  return ut;
}

const prefiks = (a, b) => {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
};

/** To ord sammenfaller: like (minst 4 tegn, så «han» og «fem» ikke teller), felles prefiks på minst 6 tegn, eller et ord (4+) er del av et sammensatt ord. */
export function ordSamvar(a, b) {
  if (a === b) return a.length >= 4 || /\d/.test(a);
  if (prefiks(a, b) >= 6) return true;
  const [k, l] = a.length <= b.length ? [a, b] : [b, a];
  return k.length >= 4 && l.includes(k);
}

function antallFelles(x, y) {
  let n = 0;
  const brukt = new Set();
  for (const a of x) {
    for (const b of y) {
      if (brukt.has(b) || !ordSamvar(a, b)) continue;
      brukt.add(b);
      n++;
      break;
    }
  }
  return n;
}

const MIN_FELLES = 2;
const tekstAv = (s) => `${s.tittel ?? ''}\n${String(s.ingress ?? '').slice(0, 300)}`;

/** Handler to saker ({ tittel, ingress? }) om samme hendelse? Minst to felles viktige ord i overskrift + ingress. */
export function sammeHendelse(a, b) {
  return antallFelles(viktigeOrd(tekstAv(a)), viktigeOrd(tekstAv(b))) >= MIN_FELLES;
}

/**
 * Holder igjen bare sakene som handler om samme hendelse som hovedsaken (den som passer med flest andre; ved
 * likhet den første). Returnerer { behold, dropp } med indekser (opprinnelig rekkefølge). Færre enn to saker: alt beholdes.
 */
export function relevanteSaker(saker) {
  const n = saker.length;
  if (n < 2) return { behold: saker.map((_, i) => i), dropp: [] };
  const ord = saker.map((s) => viktigeOrd(tekstAv(s)));
  const treff = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (antallFelles(ord[i], ord[j]) >= MIN_FELLES) {
        treff[i].push(j);
        treff[j].push(i);
      }
    }
  }
  let hoved = 0;
  treff.forEach((t, i) => {
    if (t.length > treff[hoved].length) hoved = i;
  });
  const behold = new Set([hoved, ...treff[hoved]]);
  return {
    behold: saker.map((_, i) => i).filter((i) => behold.has(i)),
    dropp: saker.map((_, i) => i).filter((i) => !behold.has(i)),
  };
}

/** Meningsfulle ord fra den lesbare slugen i en adresse: [] hvis adressen ikke har en lesbar slug (f.eks. /i/AbC123). */
export function slugOrd(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return [];
  }
  let best = [];
  for (const seg of u.pathname.split('/')) {
    let dek = seg;
    try {
      dek = decodeURIComponent(seg);
    } catch {
      // behold rå segment
    }
    const alle = dek
      .toLowerCase()
      .replace(/\.(html?|php|ece)$/, '')
      .split(/[-_.+]+/)
      .filter((o) => /^\p{L}{2,}$/u.test(o));
    const ord = alle.filter((o) => o.length >= 3 && !STOPP.has(o));
    // lesbar slug: minst tre ord, hvorav minst to meningsfulle
    if (seg.includes('-') && alle.length >= 3 && ord.length >= 2 && ord.length > best.length) best = ord;
  }
  return best;
}

/**
 * Er adressen urelatert til saken? Bare når sluggen har minst 3 ord (minst 2 meningsfulle) og ingen av dem finnes i sakens
 * tekst (tittel, ingress, begynnelsen av brødteksten). Adresser uten lesbar slug regnes aldri som urelaterte.
 */
export function urelatertUrl(url, sakstekst) {
  const slug = slugOrd(url);
  if (!slug.length) return false;
  const tekst = viktigeOrd(sakstekst);
  for (const s of viktigeOrd(slug.join(' '))) for (const t of tekst) if (ordSamvar(s, t)) return false;
  return true;
}
