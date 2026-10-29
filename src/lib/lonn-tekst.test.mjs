import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aarslonn, forskjell, kortNavn, lavNavn, lignende, lonnBeskrivelse, lonnSetninger, lonnTittel, medianRang, serieEndepunkt } from './lonn-tekst.mjs';

const alle = { kode: '0-9', navn: 'Alle yrker', median: 50000, snitt: 55000, heltidsekv: 1000000, kvinnerHv: 480000, mennHv: 520000, serie: { 2016: 40000, 2025: 50000 } };
const ny = (o) => ({ kode: '2222', navn: 'Leger', median: 80000, snitt: 88000, heltidsekv: 20000, kvinner: 76000, menn: 84000, kvinnerHv: 12000, mennHv: 8000, nedre: 70000, ovre: 95000, sektor: { stat: 78000, kommune: 79000, privat: 82000 }, serie: { 2016: 60000, 2025: 80000 }, ...o });
const data = { yrker: [alle, ny(), ny({ kode: '2221', navn: 'Sykepleiere', median: 52000, heltidsekv: 90000 }), ny({ kode: '5555', navn: 'Selgere', median: 45000 })] };
const sider = [
  { slug: 'leger', kode: '2222', navn: 'Leger' },
  { slug: 'sykepleiere', kode: '2221', navn: 'Sykepleiere' },
  { slug: 'selgere', kode: '5555', navn: 'Selgere' },
  { slug: 'lektorer', kode: '2310', navn: 'Lektorer' },
];

test('forskjell: yngre retning og terskel', () => {
  assert.deepEqual(forskjell(60, 50), { pst: 20, retning: 'over' });
  assert.deepEqual(forskjell(40, 50), { pst: 20, retning: 'under' });
  assert.deepEqual(forskjell(50.1, 50), { pst: 0, retning: 'lik' });
  assert.equal(forskjell(null, 50), null);
  assert.equal(forskjell(5, 0), null);
});

test('navnehjelpere', () => {
  assert.equal(lavNavn('Leger'), 'leger');
  assert.equal(lavNavn('IKT-teknikere'), 'IKT-teknikere');
  assert.equal(kortNavn('Sivilingeniører (geofag, mv.)'), 'Sivilingeniører');
  assert.equal(aarslonn(50000), 600000);
  assert.equal(aarslonn(null), null);
});

test('medianRang og serieEndepunkt', () => {
  assert.equal(medianRang(data, sider, '2222'), 1);
  assert.equal(medianRang(data, sider, '5555'), 3);
  assert.equal(medianRang(data, sider, '9999'), null);
  assert.deepEqual(serieEndepunkt({ 2016: 1, 2020: null, 2025: 3 }), { fra: '2016', til: '2025', a: 1, b: 3 });
  assert.equal(serieEndepunkt({ 2025: 3 }), null);
});

test('lonnSetninger: retningsord riktig, ingen vurderinger', () => {
  const s = lonnSetninger(data, ny(), 1, 4).join(' ').replace(/ /g, ' ');
  assert.match(s, /60 prosent over medianen for alle yrker, som er 50 000 kroner/);
  assert.match(s, /den høyeste medianen/);
  assert.match(s, /Menn ligger 11 prosent over kvinner/);
  assert.match(s, /en økning på 33 prosent/);
  assert.match(s, /For alle yrker under ett var økningen 25 prosent/);
  assert.match(s, /Kvinner utgjør 60 prosent/);
  assert.doesNotMatch(s, /godt|dårlig|lav lønn|høy lønn/i);
  const lav = lonnSetninger(data, ny({ median: 40000, snitt: 39000, kvinner: 41000, menn: 39000 }), 3, 4).join(' ').replace(/ /g, ' ');
  assert.match(lav, /20 prosent under medianen/);
  assert.match(lav, /3\. høyeste medianen/);
  assert.match(lav, /Gjennomsnittet er 39 000 kroner, 2,5 prosent under medianen/);
  assert.match(lav, /Kvinner ligger 5,1 prosent over menn/);
});

test('lonnSetninger: null-hull gir færre setninger, aldri NaN', () => {
  const tom = ny({ snitt: null, kvinner: null, menn: null, nedre: null, ovre: null, kvinnerHv: null, mennHv: null, sektor: { stat: null, kommune: null, privat: 70000 }, serie: {} });
  const s = lonnSetninger(data, tom, null, 4);
  const t = s.join(' ').replace(/ /g, ' ');
  assert.doesNotMatch(t, /NaN|undefined|null/);
  assert.match(t, /bare for privat sektor og offentlig eide foretak: 70 000 kroner/);
  assert.ok(!/Kvinner|kvartil/.test(t));
});

test('lonnTittel og lonnBeskrivelse holder grensene, også for lange navn', () => {
  assert.equal(lonnTittel('Leger'), 'Lønn for leger: tall fra SSB');
  const lang = 'Sivilingeniører (geofag, petroleumsteknologi, metallurgi mv.)';
  const t = lonnTittel(lang);
  assert.ok(t.length <= 49, t);
  assert.ok(t.startsWith('Lønn for sivilingeniører'));
  const lang2 = 'Operatører innen bearbeiding og produksjon av tekstiler, pels, skinn og lær';
  assert.ok(lonnTittel(lang2).length <= 49);
  for (const navn of ['Leger', lang, 'Eiendomsmeglere og -forvaltere', 'Ledere av produksjon, utvinning, bygg og anlegg, transport']) {
    const b = lonnBeskrivelse(ny({ navn }), '2025', '2016');
    assert.ok(b && b.length >= 120 && b.length <= 160, `${navn}: ${b?.length}`);
  }
  assert.equal(lonnBeskrivelse(ny({ median: null }), '2025', '2016'), null);
});

test('lignende: samme hovedgruppe, ikke seg selv', () => {
  const l = lignende(data, sider, '2222', 6);
  assert.deepEqual(l.map((s) => s.kode).sort(), ['2221', '2310']);
  assert.deepEqual(lignende(data, sider, '5555', 6), []);
});
