// Norveç kırmızı günleri (helligdager) ve iş günleri. Paskalya Meeus/Jones/Butcher (Gauss) algoritmasıyla;
// diğer günler paskalyaya göre ya da sabit tarihlidir (Lov om helligdager og helligdagsfred; Lov om 1. og 17. mai
// som høgtidsdagar). Saf hesap, veri ya da ağ yok. Tarihler 'YYYY-MM-DD'.

const UKEDAGER = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const pad = (n) => String(n).padStart(2, '0');
const tilDato = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fraDato = (s) => new Date(`${s}T00:00:00Z`);
const flytt = (s, n) => {
  const d = fraDato(s);
  d.setUTCDate(d.getUTCDate() + n);
  return tilDato(d);
};
const ukedagNr = (s) => fraDato(s).getUTCDay();

/** Her yıl için paskalya pazarı. */
export function paaskedag(aar) {
  const a = aar % 19;
  const b = Math.floor(aar / 100);
  const c = aar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maaned = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${aar}-${pad(maaned)}-${pad(dag)}`;
}

/** Yılın on iki kırmızı günü, tarih sırasıyla. */
export function helligdager(aar) {
  const p = paaskedag(aar);
  const liste = [
    [`${aar}-01-01`, 'Nyttårsdag'],
    [flytt(p, -3), 'Skjærtorsdag'],
    [flytt(p, -2), 'Langfredag'],
    [p, 'Første påskedag'],
    [flytt(p, 1), 'Andre påskedag'],
    [`${aar}-05-01`, 'Offentlig høytidsdag 1. mai'],
    [`${aar}-05-17`, 'Grunnlovsdag'],
    [flytt(p, 39), 'Kristi himmelfartsdag'],
    [flytt(p, 49), 'Første pinsedag'],
    [flytt(p, 50), 'Andre pinsedag'],
    [`${aar}-12-25`, 'Første juledag'],
    [`${aar}-12-26`, 'Andre juledag'],
  ];
  return liste
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([dato, navn]) => ({ dato, navn, ukedag: UKEDAGER[ukedagNr(dato)] }));
}

const roedeSett = (aar) => new Set(helligdager(aar).map((h) => h.dato));
const erRod = (dato) => roedeSett(Number(dato.slice(0, 4))).has(dato);
const erHverdag = (dato) => ukedagNr(dato) >= 1 && ukedagNr(dato) <= 5;
const erHelg = (dato) => !erHverdag(dato);

/**
 * Inneklemte dager: en vanlig arbeidsdag (mandag–fredag, ikke rød) som ligger mellom en rød dag på hverdag og en helg
 * eller en annen rød dag.
 */
export function inneklemteDager(aar) {
  const ut = [];
  for (let d = fraDato(`${aar}-01-01`); d.getUTCFullYear() === aar; d.setUTCDate(d.getUTCDate() + 1)) {
    const dato = tilDato(d);
    if (!erHverdag(dato) || erRod(dato)) continue;
    const for_ = flytt(dato, -1);
    const etter = flytt(dato, 1);
    const rodHverdag = (x) => erHverdag(x) && erRod(x);
    const annen = (x) => erHelg(x) || erRod(x);
    if ((rodHverdag(for_) && annen(etter)) || (rodHverdag(etter) && annen(for_))) ut.push(dato);
  }
  return ut;
}

/** Måned for måned arbeidsdager: mandag–fredag minus røde dager som faller på hverdag. */
export function arbeidsdager(aar) {
  const maaneder = Array.from({ length: 12 }, (_, i) => ({ maaned: i + 1, antall: 0 }));
  const rode = roedeSett(aar);
  for (let d = fraDato(`${aar}-01-01`); d.getUTCFullYear() === aar; d.setUTCDate(d.getUTCDate() + 1)) {
    const dato = tilDato(d);
    if (erHverdag(dato) && !rode.has(dato)) maaneder[d.getUTCMonth()].antall++;
  }
  return maaneder;
}

export const arbeidsdagerTotalt = (aar) => arbeidsdager(aar).reduce((a, m) => a + m.antall, 0);

/** Yıl sayfaları: 2026'dan cari yıl + 2'ye. */
export const AARSPENN = { fra: 2026, til: Math.max(new Date().getFullYear(), 2026) + 2 };
