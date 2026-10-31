// Rene regler for leseverktøyene på artikkelsiden (src/scripts/leseverktoy.ts). Ingen DOM og ingen localStorage her.

export const SKALAER = ['0', '1', '2', '3']; // A−, A, A+, A++ (0,9 / 1 / 1,2 / 1,4)

// Lagret tekststørrelse -> '0' | '1' | '2' | '3'. Alt ugyldig gir '1'.
export function skalaFra(lagret) {
  const s = typeof lagret === 'number' ? String(lagret) : lagret;
  return SKALAER.includes(s) ? s : '1';
}

export const FORTSETT_FRA = 0.1;
export const FORTSETT_TIL = 0.95;

// Lagret leseposisjon (0–1) -> posisjonen hvis den er mellom 10 % og 95 %, ellers null.
export function fortsettFra(posisjon) {
  if (posisjon === null || posisjon === undefined || posisjon === '') return null;
  const p = Number(posisjon);
  if (!Number.isFinite(p)) return null;
  return p >= FORTSETT_FRA && p <= FORTSETT_TIL ? p : null;
}

// Hvor langt leseren er kommet i brødteksten (0–1). Linjen 60 % ned i vinduet teller som «lest til hit».
export function fremdrift(toppAvTekst, tekstHoyde, vindusHoyde) {
  if (!(tekstHoyde > 0)) return 0;
  const s = (vindusHoyde * 0.6 - toppAvTekst) / tekstHoyde;
  return Math.min(1, Math.max(0, s));
}

// Index til norsk stemme: nb først, så no, så nn. -1 hvis ingen. Støtter «nb-NO» og «nb_NO».
export function velgStemme(stemmer) {
  const liste = Array.isArray(stemmer) ? stemmer : [];
  const sprak = (v) => String(v?.lang ?? '').toLowerCase().replace('_', '-').split('-')[0];
  for (const kode of ['nb', 'no', 'nn']) {
    const i = liste.findIndex((v) => sprak(v) === kode);
    if (i >= 0) return i;
  }
  return -1;
}

export const lagringsnokkel = (sti) => `les:${sti}`;
