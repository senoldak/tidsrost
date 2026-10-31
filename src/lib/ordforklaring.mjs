// Finner ord i en tekst som har en kort forklaring i src/data/ordbok.json (Bokmålsordboka, CC BY 4.0).
// Ren funksjon, brukes av rehype-ord.mjs ved bygging.

const BOKSTAV = /\p{L}/u;
const registre = new WeakMap();

// Bøyningsformer (enkle suffiksregler) for ett oppslagsord, alt i små bokstaver.
export function former(lemma) {
  const l = lemma.toLowerCase();
  const ut = new Set([l]);
  for (const s of ['en', 'et', 'er', 'ene', 'a', 'e']) ut.add(l + s);
  if (l.endsWith('e')) {
    const b = l.slice(0, -1);
    // trusselbilde -> trusselbildet/-n/-r/-ne; evakuere -> evakuert/evakuerte; uten dobbel e
    for (const s of ['t', 'n', 'r', 'ne']) ut.add(l + s);
    for (const s of ['en', 'er', 'ene', 'et', 'a', 'te', 't']) ut.add(b + s);
  }
  return ut;
}

function register(ordbok) {
  const ord = ordbok?.ord ?? ordbok ?? {};
  let r = registre.get(ord);
  if (r) return r;
  r = new Map();
  for (const [lemma, def] of Object.entries(ord)) {
    for (const f of former(lemma)) if (!r.has(f)) r.set(f, { lemma, def });
  }
  registre.set(ord, r);
  return r;
}

// finnOrd(tekst, ordbok, maks = 3) -> [{ ord, lemma, def, start, slutt }] i tekstrekkefølge,
// første forekomst per oppslagsord, aldri inne i et annet ord (heller ikke i sammensetninger med bindestrek).
export function finnOrd(tekst, ordbok, maks = 3, alleredeBrukt = new Set()) {
  const reg = register(ordbok);
  const ut = [];
  if (!tekst || maks <= 0) return ut;
  const brukt = new Set(alleredeBrukt);
  const re = /\p{L}+/gu;
  let m;
  while ((m = re.exec(tekst)) !== null) {
    const treff = reg.get(m[0].toLowerCase());
    if (!treff || brukt.has(treff.lemma)) continue;
    const før = tekst[m.index - 1];
    const etter = tekst[m.index + m[0].length];
    const bindeFør = før === '-' && m.index >= 2 && BOKSTAV.test(tekst[m.index - 2]);
    const bindeEtter = etter === '-' && BOKSTAV.test(tekst[m.index + m[0].length + 1] ?? '');
    if (bindeFør || bindeEtter) continue;
    brukt.add(treff.lemma);
    ut.push({ ord: m[0], lemma: treff.lemma, def: treff.def, start: m.index, slutt: m.index + m[0].length });
    if (ut.length >= maks) break;
  }
  return ut;
}
