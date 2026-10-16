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
