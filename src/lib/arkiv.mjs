// Kalenderarkiv: artiklene gruppert per dag (Oslo-tid), én side per dag og en månedskalender.
import { osloDag } from './apenhet.mjs';

// Dagssider med færre artikler enn dette er stengt for søkemotorer (noindex, follow) og står ikke i nettstedskartet.
export const ARKIV_TERSKEL = 3;

const MANEDER = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

/** "2026-10-16" → "16. oktober 2026" */
export const dagTittel = (dag) => {
  const [a, m, d] = dag.split('-').map(Number);
  return `${d}. ${MANEDER[m - 1]} ${a}`;
};

/** "2026-10" → "Oktober 2026" */
export const manedTittel = (mnd) => {
  const [a, m] = mnd.split('-').map(Number);
  const n = MANEDER[m - 1];
  return `${n[0].toUpperCase()}${n.slice(1)} ${a}`;
};

/** Artikler ({ data: { date } }) per dag, nyeste dag først; artiklene i hver dag nyeste først. */
export function delPaDager(artikler) {
  const kart = new Map();
  for (const a of artikler) {
    const d = osloDag(a.data.date);
    if (!kart.has(d)) kart.set(d, []);
    kart.get(d).push(a);
  }
  return [...kart.entries()]
    .map(([dag, liste]) => ({ dag, artikler: liste.sort((x, y) => y.data.date - x.data.date) }))
    .sort((a, b) => (a.dag < b.dag ? 1 : -1));
}

/** Månedskalender med uker som starter på mandag; tomme celler er null. */
export function manedskalender(mnd, antall) {
  const [a, m] = mnd.split('-').map(Number);
  const dagerIMnd = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const tomme = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
  const celler = Array.from({ length: tomme }, () => null);
  for (let d = 1; d <= dagerIMnd; d++) {
    const dag = `${mnd}-${String(d).padStart(2, '0')}`;
    celler.push({ dag, nr: d, antall: antall.get(dag) ?? 0 });
  }
  while (celler.length % 7) celler.push(null);
  const uker = [];
  for (let i = 0; i < celler.length; i += 7) uker.push(celler.slice(i, i + 7));
  return uker;
}

/** ISO 8601-uke: "2026-10-16" → { ar: 2026, nr: 42, nokkel: "2026-42" } (uka starter mandag). */
export function isoUke(dag) {
  const [a, m, d] = dag.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3); // ukas torsdag
  const ar = t.getUTCFullYear();
  // Uka tilhører året torsdagen ligger i; nummeret er hele uker siden 1. januar det året + 1.
  const nr = 1 + Math.floor((t - Date.UTC(ar, 0, 1)) / 86400000 / 7);
  return { ar, nr, nokkel: `${ar}-${String(nr).padStart(2, '0')}` };
}

/** Dager (fra delPaDager) samlet per ISO-uke, nyeste uke først. */
export function delPaUker(dager) {
  const kart = new Map();
  for (const d of dager) {
    const u = isoUke(d.dag);
    if (!kart.has(u.nokkel)) kart.set(u.nokkel, { ...u, dager: [] });
    kart.get(u.nokkel).dager.push(d);
  }
  return [...kart.values()]
    .map((u) => ({
      ...u,
      dager: u.dager.sort((a, b) => (a.dag < b.dag ? 1 : -1)),
      forste: u.dager.map((d) => d.dag).sort()[0],
      siste: u.dager.map((d) => d.dag).sort().at(-1),
      antall: u.dager.reduce((t, d) => t + d.artikler.length, 0),
    }))
    .sort((a, b) => (a.nokkel < b.nokkel ? 1 : -1));
}
