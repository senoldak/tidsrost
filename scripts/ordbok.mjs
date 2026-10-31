// Henter forklaringer fra Bokmålsordboka (ord.uib.no, CC BY 4.0) og skriver src/data/ordbok.json.
// Kjøres for hånd: node scripts/ordbok.mjs
// Beholder bare oppslag med nøyaktig én hoveddefinisjon på høyst 120 tegn uten ufullstendige plassholdere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mappe = path.dirname(fileURLToPath(import.meta.url));
const KANDIDATER = path.join(mappe, 'ordbok-kandidater.txt');
const UT = path.join(mappe, '..', 'src', 'data', 'ordbok.json');
const UA = 'tidsrost.com ordforklaringer (redaksjon@tidsrost.com)';
const MAKS_TEGN = 120;
// Redaksjonelt utelatt etter gjennomlesing: tom omskriving, grammatisk avkuttet (infinitiv/grunnform satt inn for
// plassholder), eller bare én av flere betydninger i nyhetsbruk.
const UTELATT = new Set([
  'regelverk', 'dødsfall', 'eksportør', 'inntekt', 'overvann', 'vaksine', 'evakuering', 'finansiering', 'nedbemanning',
  'sårbarhet', 'statsborgerskap', 'lønnsoppgjør', 'solkraft', 'knapphet', 'cyberangrep', 'kronekurs', 'valutakurs',
  'ordlyd', 'rekord', 'granske', 'asylsøker', 'sykemelding', 'overdose', 'fornybar',
]);
const sov = (ms) => new Promise((r) => setTimeout(r, ms));

async function hentJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Tekst fra ett forklaringselement: bare strenger, `$` er plassholder for oppslagsordet og fjernes.
function tekstAv(el) {
  if (el == null) return '';
  if (typeof el === 'string') return el;
  if (Array.isArray(el)) return el.map(tekstAv).join(' ');
  if (el.type_ === 'explanation' || el.type_ === 'definition') return tekstAv(el.content ?? el.items);
  if (typeof el.text === 'string') return el.text;
  if (el.content) return tekstAv(el.content);
  if (el.items) return tekstAv(el.items);
  return '';
}

// Alle forklaringer i en definisjon (inkl. underdefinisjoner); returnerer rensede, ikke-tomme strenger.
function forklaringer(def) {
  const ut = [];
  const gå = (d) => {
    if (!d) return;
    if (Array.isArray(d)) return d.forEach(gå);
    if (d.type_ === 'explanation') {
      const t = tekstAv(d.content).replace(/\s+/g, ' ').trim();
      if (t) ut.push(t);
    }
    if (d.elements) gå(d.elements);
    if (d.definitions) gå(d.definitions);
  };
  gå(def);
  return ut;
}

// Setter inn oppslagene som `$` står for (article_ref/streng) i rekkefølge; null hvis noe ikke lar seg løse.
function løsPlassholdere(el) {
  const innhold = String(el.content ?? '');
  const deler = innhold.split('$');
  const items = Array.isArray(el.items) ? el.items : [];
  if (deler.length - 1 !== items.length) return null;
  let ut = deler[0];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const ord = typeof it === 'string' ? it : it?.type_ === 'article_ref' ? it.lemmas?.[0]?.lemma : null;
    if (!ord || /\$/.test(ord)) return null;
    ut += ord + deler[i + 1];
  }
  return ut;
}

const SLUTTORD = /(en|et|ei|av|for|i|på|til|som|og|eller|å|med|at|der|om|fra|ved)$/i;

export function enkelDefinisjon(artikkel) {
  const defs = artikkel?.body?.definitions;
  if (!Array.isArray(defs) || defs.length !== 1) return null;
  // Nøyaktig én forklaring i hele definisjonen (ingen underbetydninger).
  const forkl = [];
  const gå = (d) => {
    if (!d) return;
    if (Array.isArray(d)) return d.forEach(gå);
    if (d.type_ === 'explanation') forkl.push(d);
    if (d.elements) gå(d.elements);
    if (d.definitions) gå(d.definitions);
  };
  gå(defs[0]);
  const ikkeTomme = forkl.filter((e) => String(e.content ?? '').trim());
  if (ikkeTomme.length !== 1) return null;
  const løst = løsPlassholdere(ikkeTomme[0]);
  if (!løst) return null;
  const t = løst.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').replace(/\s+([,.;:)])/g, '$1').trim();
  if (!t || t.length > MAKS_TEGN || /\$/.test(t) || SLUTTORD.test(t) || /[,:]\s*[,:]|^[,:]/.test(t)) return null;
  return t;
}

async function main() {
  const kandidater = [...new Set(fs.readFileSync(KANDIDATER, 'utf8').split(/\r?\n/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const ord = {};
  let ikke = 0;
  for (const lemma of kandidater) {
    try {
      const s = await hentJson(`https://ord.uib.no/api/articles?w=${encodeURIComponent(lemma)}&dict=bm&scope=e`);
      await sov(300);
      const ider = s?.articles?.bm ?? [];
      if (ider.length !== 1) { console.log(`- ${lemma}: ${ider.length} artikler`); ikke++; continue; }
      const a = await hentJson(`https://ord.uib.no/bm/article/${ider[0]}.json`);
      await sov(300);
      const lemmaer = (a.lemmas ?? []).map((l) => String(l.lemma).toLowerCase());
      if (!lemmaer.includes(lemma)) { console.log(`- ${lemma}: lemma samsvarer ikke (${lemmaer.join(',')})`); ikke++; continue; }
      if (UTELATT.has(lemma)) { console.log(`- ${lemma}: redaksjonelt utelatt`); ikke++; continue; }
      const d = enkelDefinisjon(a);
      if (!d) { console.log(`- ${lemma}: ikke enkel definisjon`); ikke++; continue; }
      ord[lemma] = d;
      console.log(`+ ${lemma}: ${d}`);
    } catch (e) {
      console.log(`! ${lemma}: ${e.message}`);
      ikke++;
    }
  }
  const sortert = Object.fromEntries(Object.entries(ord).sort(([a], [b]) => a.localeCompare(b, 'nb')));
  const ut = {
    kilde: {
      navn: 'Bokmålsordboka, Universitetet i Bergen og Språkrådet',
      url: 'https://ordbokene.no',
      lisens: 'CC BY 4.0',
      lisensUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    hentet: new Date().toISOString().slice(0, 10),
    ord: sortert,
  };
  fs.writeFileSync(UT, JSON.stringify(ut, null, 2) + '\n');
  console.log(`\nKandidater: ${kandidater.length}, beholdt: ${Object.keys(sortert).length}, utelatt: ${ikke}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
