// Åpenhet-siden: hvor mange saker nyhetsroboten har gått gjennom, hvor mange artikler som ble publisert, og fra
// hvilke kildetyper. Medienes navn vises ikke (kildene ligger kryptert, se scripts/nyheter/hemmelig.mjs); offentlige
// kilder telles per etat. Gjennomgåtte saker kommer fra scripts/nyheter/sett.json, publiserte fra innholdssamlingen.

const DAG_MS = 86400000;

/** Kalenderdag i Oslo (ÅÅÅÅ-MM-DD). */
export const osloDag = (t) => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });

// Kilde-ID: "<kilde>:<id>". Medier ("medier:…") er ikke-offentlige; alt annet er en offentlig etat eller organisasjon.
const kildeAv = (id) => String(id).split(':')[0].toLowerCase();
export const kildetype = (id) => (kildeAv(id) === 'medier' ? 'medier' : 'offentlig');

/**
 * @param artikler {{ date: Date }[]}
 * @param sett {Record<string, string>} ID → tidspunkt (ISO)
 */
export function apenhetsdata(artikler, sett, { naa = new Date(), dager = 30 } = {}) {
  const saker = Object.entries(sett ?? {}).map(([id, t]) => ({ id, dag: osloDag(t) }));
  const forste = saker.map((s) => s.dag).sort()[0];
  const idag = osloDag(naa);
  const dagliste = [];
  for (let i = dager - 1; i >= 0; i--) {
    const d = osloDag(naa.valueOf() - i * DAG_MS);
    if (!forste || d >= forste) dagliste.push(d);
  }
  const fra = dagliste[0] ?? idag;
  const iVindu = (d) => d >= fra && d <= idag;
  const publisert = artikler.filter((a) => iVindu(osloDag(a.date)));
  const gjennomgatt = saker.filter((s) => iVindu(s.dag));

  const daglig = dagliste.map((d) => ({
    dag: d,
    gjennomgatt: gjennomgatt.filter((s) => s.dag === d).length,
    publisert: publisert.filter((a) => osloDag(a.date) === d).length,
  }));
  const offentlige = gjennomgatt.filter((s) => kildetype(s.id) === 'offentlig');
  return {
    fra,
    til: idag,
    antallDager: dagliste.length,
    gjennomgatt: gjennomgatt.length,
    publisert: publisert.length,
    andelPublisert: gjennomgatt.length ? publisert.length / gjennomgatt.length : 0,
    offentlige: { saker: offentlige.length, kilder: new Set(offentlige.map((s) => kildeAv(s.id))).size },
    medier: { saker: gjennomgatt.length - offentlige.length },
    daglig,
  };
}
