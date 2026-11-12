// Kaynak: mecmua/site-ortak/dil-nb/dil-nb.mjs. Burada düzenleme; kaynağı düzenleyip node site-ortak/kopyala.mjs çalıştır.
// Språkkontroll i kode for bokmål-nyheter (12. november 2026). Flash-Lite skrev og godkjente sin egen tekst, og ingen
// steg kontrollerte språket: "påkjkning", "opppeturen", "vented", "til til å", "450.000" og engelske sitater kom ut.
//   rettNb(tekst)               sikre rettelser (tusenskille, °C, tankestrek i tallintervall)
//   sprakProblemerNb(tekst)     gjenstående problemer; `kesin` må rettes før publisering, resten går til språkvask
//   ukjenteOrdNb(tekst, valg)   mulige skrivefeil: ord som verken finnes i korpuset/kilden eller i Bokmålsordboka
// Bokmålsordboka (ord.uib.no, CC BY 4.0) brukes allerede av scripts/ordbok.mjs.

const BOKSTAV = 'a-zæøåéA-ZÆØÅÉ';

export function rettNb(tekst) {
  if (typeof tekst !== 'string' || !tekst) return tekst;
  let s = tekst;
  // Tusenskille: punktum → mellomrom (450.000 → 450 000). Datoer (12.11.2026) og klokkeslett (14.15) har ikke tre sifre
  // etter punktum, versjonsnumre er sjeldne i nyheter.
  s = s.replace(/(?<![\d.,])(\d{1,3})((?:\.\d{3})+)(?![\d.,]\d)/g, (_, a, rest) => a + rest.replace(/\./g, ' '));
  // Grader: 2,8°C → 2,8 °C (Språkrådet).
  s = s.replace(/(\d)°\s?([CF])\b/g, '$1 °$2');
  // Tallintervall og resultater: 4-6 → 4–6. ISO-datoer (2026-11-12) og lengre tall røres ikke.
  s = s.replace(/(?<![\d-])(\d{1,3})-(\d{1,3})(?![\d-])/g, '$1–$2');
  return s;
}

const ENGELSK = new Set([
  'the', 'and', 'of', 'is', 'are', 'was', 'were', 'with', 'that', 'this', 'have', 'has', 'had', 'will', 'would', 'be',
  'been', 'from', 'their', 'they', 'which', 'what', 'into', 'than', 'it', 'its', 'we', 'our', 'you', 'not', 'but', 'can',
  'should', 'there', 'where', 'when', 'about', 'more', 'every', 'doing', 'less',
]);
// Ord som også er norske (for, to, by, i, at, on) er bevisst utelatt.
const SETNING_ENG = new Set(['is', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would', 'be', 'been', 'can', 'should', 'we', 'our', 'they', 'their', 'it', 'its', 'you', 'that', 'this', 'which', 'where', 'when', 'not', 'but', 'there']);

const MØNSTRE = [
  { re: /(?<![a-zæøå])syd(gående|over|på|vest|øst)?(?![a-zæøå])/g, mld: '"syd" er dansk/svensk: skriv "sør" ("sørgående", "sør for")' },
  { re: /(?<![a-zæøå])individer(?![a-zæøå])/g, mld: '"individer" er oversatt engelsk: skriv "personer" eller "mennesker"' },
  { re: /Det er foreløpig ikke gitt ytterligere detaljer/g, mld: 'Fyllsetning: stryk den' },
  { re: /(?<![a-zæøå])(avdekker|viser) en betydelig utvikling/g, mld: 'Tom frase: si konkret hva som har skjedd' },
  { re: /Den amerikanske (sjefen|lederen)/g, mld: 'Omskrivning av navn: bruk tittel og navn ("president Donald Trump")' },
];

function setninger(tekst) {
  return tekst
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÆØÅ"«])/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function engelskeRekker(tekst) {
  const rekker = [];
  let rekke = [];
  for (const w of tekst.split(/[\s“”"«»()]+/)) {
    const ren = w.replace(/[.,;:!?’']+$/, '').replace(/^[‘']+/, '');
    if (/^[A-Za-z][A-Za-z'’-]*$/.test(ren)) rekke.push(ren);
    else {
      if (rekke.length) rekker.push(rekke);
      rekke = [];
    }
  }
  if (rekke.length) rekker.push(rekke);
  return rekker;
}

/** Problemer: [{ kod, mesaj, kesin, ornek }]. valg.brodtekst: avsnittskontroll. */
export function sprakProblemerNb(tekst, valg = {}) {
  if (typeof tekst !== 'string' || !tekst.trim()) return [];
  const p = [];
  const legg = (kod, mesaj, kesin, ornek) => p.push({ kod, mesaj, kesin: Boolean(kesin), ...(ornek && { ornek }) });

  // Tre like bokstaver på rad finnes ikke i bokmål (opppeturen); forkortelser med store bokstaver og www unntatt.
  const trippel = tekst.replace(/(?<![a-z])www(?![a-z])/gi, '').match(new RegExp(`[${BOKSTAV}]*([a-zæøå])\\1\\1[${BOKSTAV}]*`));
  if (trippel) legg('skrivefeil', `Skrivefeil: «${trippel[0]}»`, true, trippel[0]);

  const dobbel = tekst.match(/(?<![a-zæøå])(til|og|på|med|av|å|er|har|en|et|som|i) \1(?![a-zæøå])/i);
  if (dobbel) legg('dobbelt-ord', `Samme ord to ganger: «${dobbel[0]}»`, true, dobbel[0]);

  for (const r of engelskeRekker(tekst)) {
    if (r.length < 6) continue;
    const eng = r.map((w) => w.toLowerCase()).filter((w) => ENGELSK.has(w));
    const små = r.filter((w) => /^[a-z]/.test(w)).length;
    if (eng.length >= 2 && eng.some((w) => SETNING_ENG.has(w)) && små * 2 >= r.length) {
      legg('engelsk', 'Uoversatt engelsk setning: oversett til norsk, eller gjengi sitatet indirekte', true, r.join(' ').slice(0, 120));
      break;
    }
  }

  const sett = new Set();
  for (const s of setninger(tekst)) {
    const n = s.toLowerCase().replace(/[^a-zæøå0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    if (n.split(' ').length < 5) continue;
    if (sett.has(n)) {
      legg('gjentatt-setning', 'Samme setning to ganger: stryk den ene', true, s.slice(0, 120));
      break;
    }
    sett.add(n);
  }

  // Tall skrevet med bokstaver foran store tall og datoer ("tjueen land", "den attende november").
  const tallord = tekst.match(/(?<![a-zæøå])(tjue|tretti|førti|femti|seksti|sytti|åtti|nitti)(en|to|tre|fire|fem|seks|sju|syv|åtte|ni)?(?![a-zæøå])|den (attende|nittende|tjuende|tjueførste|trettiende) (januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i);
  if (tallord) legg('tall-med-bokstaver', 'Tall over tolv og datoer skrives med sifre ("21 land", "18. november")', false, tallord[0]);

  for (const m of MØNSTRE) {
    const f = tekst.match(m.re);
    if (f) legg('monster', m.mld, false, f[0]);
  }

  if (valg.brodtekst) {
    const avsnitt = tekst.split(/\n\s*\n/).filter((a) => a.trim() && !/^#/.test(a.trim()));
    if (avsnitt.length === 1 && tekst.split(/\s+/).length > 150) legg('ett-avsnitt', 'Brødteksten er ett avsnitt: del i 3–6 avsnitt', false);
  }
  return p;
}

export const kesinProblemer = (p) => p.filter((x) => x.kesin);

export function problemListe(p) {
  if (!p.length) return '';
  return p.map((x) => `- ${x.mesaj}${x.ornek ? ` (eksempel: «${x.ornek}»)` : ''}`).join('\n');
}

// --- Mulige skrivefeil -------------------------------------------------------------------------------------------

const ordAv = (tekst) => tekst.match(new RegExp(`[${BOKSTAV}]+`, 'g')) ?? [];

/** Ord som finnes i minst `min` ulike tekster i korpuset (publiserte saker), i små bokstaver. Tre, ikke to: en
 * skrivefeil kopieres ofte fra saken til kort fortalt-oppsummeringen. */
export function korpusOrd(tekster, min = 3) {
  const teller = new Map();
  for (const t of tekster) for (const o of new Set(ordAv(t).map((x) => x.toLowerCase()))) teller.set(o, (teller.get(o) ?? 0) + 1);
  const kjente = new Set();
  for (const [o, n] of teller) if (n >= min) kjente.add(o);
  return kjente;
}

const ordbokBuffer = new Map();

async function finnesIOrdboka(ord, hent) {
  if (ordbokBuffer.has(ord)) return ordbokBuffer.get(ord);
  let svar = true; // ved feil: anta at ordet finnes (aldri stopp en sak fordi ordboka er nede)
  try {
    const r = await hent(`https://ord.uib.no/api/suggest?q=${encodeURIComponent(ord)}&dict=bm&n=5&include=ei`, {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const j = await r.json();
      const eksakt = (j.a?.exact ?? []).some(([o]) => o.toLowerCase() === ord);
      svar = eksakt || (j.a?.inflect ?? []).length > 0;
    }
  } catch {
    svar = true;
  }
  ordbokBuffer.set(ord, svar);
  return svar;
}

// Sammensatt ord (begge ledd minst fire bokstaver, ellers blir var+maste godtatt): begge ledd kjente (med eventuelt fugebokstav s/e), f.eks. redningsinnsatsen = rednings + innsatsen.
function sammensattKjent(ord, kjent) {
  for (let i = 4; i <= ord.length - 4; i++) {
    const høyre = ord.slice(i);
    if (!kjent(høyre)) continue;
    const venstre = ord.slice(0, i);
    if (kjent(venstre) || (/[se]$/.test(venstre) && kjent(venstre.slice(0, -1)))) return true;
  }
  return false;
}

// Samme, men ett ledd får slås opp i ordboka når det andre er kjent fra korpuset (høyst `maks` oppslag).
async function sammensattIOrdboka(ord, kjent, hent, maks) {
  let brukt = 0;
  for (let i = 4; i <= ord.length - 4 && brukt < maks; i++) {
    const venstre = ord.slice(0, i);
    const høyre = ord.slice(i);
    const venstreKjent = kjent(venstre) || (/[se]$/.test(venstre) && venstre.length > 3 && kjent(venstre.slice(0, -1)));
    if (venstreKjent) {
      brukt++;
      if (await finnesIOrdboka(høyre, hent)) return true;
    } else if (kjent(høyre)) {
      brukt++;
      const v = /[se]$/.test(venstre) && venstre.length > 3 ? venstre.slice(0, -1) : venstre;
      if (await finnesIOrdboka(v, hent)) return true;
    }
  }
  return false;
}

/**
 * Mulige skrivefeil. Ord med stor forbokstav (navn), korte ord og ord i kilden/korpuset hoppes over; resten slås opp i
 * Bokmålsordboka (maks `maksOppslag`). valg: { korpus: Set, kilde: string, hent: fetch, maksOppslag }.
 */
export async function ukjenteOrdNb(tekst, { korpus = new Set(), kilde = '', hent = globalThis.fetch, maksOppslag = 30 } = {}) {
  if (!tekst || !hent) return [];
  const kildeOrd = new Set(ordAv(kilde).map((x) => x.toLowerCase()));
  const kjent = (o) => korpus.has(o) || kildeOrd.has(o) || ordbokBuffer.get(o) === true;
  const kandidater = [...new Set(ordAv(tekst).filter((o) => /^[a-zæøå]/.test(o) && o.length >= 4).map((o) => o.toLowerCase()))].filter(
    (o) => !kjent(o),
  );
  const ukjente = [];
  const start = ordbokBuffer.size;
  const igjen = () => maksOppslag - (ordbokBuffer.size - start);
  for (const o of kandidater) {
    if (sammensattKjent(o, kjent)) continue;
    // Genitiv (plattformens, barnas, folks) står ikke i ordboka.
    if (o.endsWith('s') && kjent(o.slice(0, -1))) continue;
    if (igjen() <= 0) break;
    if (await finnesIOrdboka(o, hent)) continue;
    if (o.endsWith('s') && (await finnesIOrdboka(o.slice(0, -1), hent))) continue;
    if (sammensattKjent(o, kjent)) continue;
    if (igjen() > 0 && (await sammensattIOrdboka(o, kjent, hent, Math.min(4, igjen())))) continue;
    ukjente.push(o);
  }
  return ukjente;
}
