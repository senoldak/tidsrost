// Standardrapport (/standardrapport/): kvartalsvise tall om hvordan redaksjonelle prinsipper er brukt.
// Rene funksjoner, ingen Astro-avhengighet. Tall fra den automatiske kontrolloggen kommer fra
// src/data/standartlar-raporu/<ÅÅÅÅ>-c<N>.json (skrives av botens arbeidsflyt etter kvartalets slutt);
// resten telles ved bygging fra nettstedets eget innhold.
//
// src/data/klager.json: liste over klager som er avgjort, én linje per klage (ingen identitet, ingen klagetekst):
//   { "alindi": "ÅÅÅÅ-MM-DD", "karar": "ÅÅÅÅ-MM-DD", "sonuc": "yerinde" | "kismen" | "yerinde-degil" }
// Feltnavnene er felles for alle fire nettsteder og forblir tyrkiske. Klager telles i kvartalet avgjørelsen falt (karar).
//
// Rapport-JSON: { ceyrek:"2026-c4", bas, son, defterBaslangici, yazildi, elendi, kirmizi, sari,
//   kurallar:{kirmizi:{kode:n}, sari:{kode:n}}, geminiCagri, kuralDegisiklikleri:["ÅÅÅÅ-MM-DD"]|null, uretim }

import { erEierSak, erKjedeSak } from './kinote.mjs';

/** Kalenderdag i Oslo (ÅÅÅÅ-MM-DD). */
export const osloDag = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

const MAANEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const delDato = (d) => String(d).split('-').map(Number);

/** «2026-10-20» -> «20. oktober 2026» */
export function datoTekst(dag) {
  const [a, m, d] = delDato(dag);
  return `${d}. ${MAANEDER[m - 1]} ${a}`;
}

/** «2026-c4» -> «4. kvartal 2026» */
export function kvartalNavn(ceyrek) {
  const m = /^(\d{4})-c([1-4])$/.exec(ceyrek);
  return m ? `${m[2]}. kvartal ${m[1]}` : String(ceyrek);
}

/** («2026-10-01», «2026-12-31») -> «1. oktober – 31. desember 2026» */
export function periodeTekst(bas, son) {
  const [a1, m1, d1] = delDato(bas);
  const [a2] = delDato(son);
  return a1 === a2 ? `${d1}. ${MAANEDER[m1 - 1]} – ${datoTekst(son)}` : `${datoTekst(bas)} – ${datoTekst(son)}`;
}

// Regelnavn på bokmål (kodene er de i scripts/nyheter/standart-kurallar.json). Ukjent kode vises som den er.
export const REGELNAVN = {
  suc: 'kriminalitet',
  'suc-genel': 'kriminalitet',
  cocuk: 'barn',
  intihar: 'selvmord',
  teror: 'terror',
  'savas-dili': 'krigsretorikk',
  'grup-genelleme': 'gruppegeneralisering',
  'turkiye-devlet': 'tyrkiske statsledere',
  'yatirim-tavsiyesi': 'investeringsråd',
  'ozel-haber': 'annen redaksjons eksklusive sak',
  'kaynak-benzerligi': 'for lik kildeteksten',
  'medya-adi': 'medienavn',
  'olum-kaza': 'død og ulykker',
  'turkiye-resmi': 'tyrkiske myndigheter',
  'savas-konu': 'krig',
  secim: 'valg',
  'grup-konu': 'grupperelaterte temaer',
  'kurum-degerlendirme': 'vurdering av institusjoner',
};
export const regelnavn = (kode) => REGELNAVN[kode] ?? String(kode);

/** Regler med tall > 0 (samme navn slås sammen), størst først, så alfabetisk. [{ navn, antall }] */
export function regelListe(kurallar) {
  const samlet = new Map();
  for (const [kode, n] of Object.entries(kurallar ?? {})) {
    if (!(n > 0)) continue;
    const navn = regelnavn(kode);
    samlet.set(navn, (samlet.get(navn) ?? 0) + n);
  }
  return [...samlet].map(([navn, antall]) => ({ navn, antall })).sort((a, b) => b.antall - a.antall || a.navn.localeCompare(b.navn, 'nb'));
}

const iPeriode = (dag, bas, son) => dag >= bas && dag <= son;

/**
 * Teller fra nettstedets eget innhold i [bas, son] (Oslo-dager, inklusive).
 * artikler: { date, oppdatert?, author?, sjanger?, produksjon?, rettelse? }[]
 * avpublisert: { dato }[]   klager: { karar, sonuc }[]
 * Farevarsler er ikke saker (egen datafil) og telles ikke her.
 */
export function innholdTall({ artikler = [], avpublisert = [], klager = [] } = {}, bas, son) {
  const publisert = artikler.filter((a) => iPeriode(osloDag(a.date), bas, son));
  const kjede = publisert.filter((a) => erKjedeSak(a)).length;
  const eier = publisert.filter((a) => !erKjedeSak(a) && erEierSak(a)).length;
  const rettelser = artikler.filter((a) => a.rettelse && iPeriode(osloDag(a.oppdatert ?? a.date), bas, son)).length;
  const fjernet = avpublisert.filter((a) => iPeriode(String(a.dato).slice(0, 10), bas, son)).length;
  const k = klager.filter((x) => iPeriode(x.karar, bas, son));
  return {
    bot: publisert.length - eier - kjede,
    eier,
    kjede,
    rettelser,
    fjernet,
    klager: {
      totalt: k.length,
      yerinde: k.filter((x) => x.sonuc === 'yerinde').length,
      kismen: k.filter((x) => x.sonuc === 'kismen').length,
      yerindeDegil: k.filter((x) => x.sonuc === 'yerinde-degil').length,
    },
  };
}

/** Øvrige forkastede = elendi − kirmizi, aldri negativ. */
export const ovrigeForkastede = (r) => Math.max(0, (r.elendi ?? 0) - (r.kirmizi ?? 0));

/** Rapporter, nyeste kvartal først. Ugyldige oppføringer hoppes over. */
export const sorterRapporter = (liste) =>
  (liste ?? []).filter((r) => r && r.ceyrek && r.bas && r.son).sort((a, b) => b.bas.localeCompare(a.bas));

/** Samler alt én rapportseksjon trenger. */
export function kvartalSeksjon(rapport, innhold) {
  return {
    ceyrek: rapport.ceyrek,
    navn: kvartalNavn(rapport.ceyrek),
    periode: periodeTekst(rapport.bas, rapport.son),
    ...innholdTall(innhold, rapport.bas, rapport.son),
    yazildi: rapport.yazildi ?? 0,
    elendi: rapport.elendi ?? 0,
    kirmizi: rapport.kirmizi ?? 0,
    sari: rapport.sari ?? 0,
    ovrige: ovrigeForkastede(rapport),
    sariRegler: regelListe(rapport.kurallar?.sari),
    kirmiziRegler: regelListe(rapport.kurallar?.kirmizi),
    geminiCagri: rapport.geminiCagri ?? 0,
    regelEndringer: Array.isArray(rapport.kuralDegisiklikleri) ? rapport.kuralDegisiklikleri : null,
    loggFra: rapport.defterBaslangici && rapport.defterBaslangici > rapport.bas ? datoTekst(rapport.defterBaslangici) : null,
  };
}
