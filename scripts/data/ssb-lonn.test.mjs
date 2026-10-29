import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALLE, gruppeAv, komprimer, lonnData, lonnSider, rensEtikett } from './ssb-lonn.mjs';

// Küçük JSON-stat2 kurucusu (ssb-navn.test.mjs'teki ile aynı).
function lag(dims, deger) {
  const id = dims.map(([ad]) => ad);
  const size = dims.map(([, k]) => k.length);
  const dimension = Object.fromEntries(
    dims.map(([ad, k]) => [ad, { category: { index: Object.fromEntries(k.map(([kod], i) => [kod, i])), label: Object.fromEntries(k) } }]),
  );
  const value = [];
  const rek = (d, rad) => {
    if (d === dims.length) return value.push(deger(rad));
    for (const [kod] of dims[d][1]) rek(d + 1, { ...rad, [dims[d][0]]: kod });
  };
  rek(0, {});
  return { class: 'dataset', updated: '2026-08-28T06:00:00Z', id, size, dimension, value };
}

const YRKER = [
  ['0-9', 'Alle yrker'],
  ['2', 'Akademiske yrker'],
  ['3_01-03', 'Høyskole- og militære yrker'],
  ['21', 'Realister, sivilingeniører mv.'], // 2 haneli: dışarıda
  ['0000', 'Uoppgitt / yrker som ikke kan identifiseres'],
  ['2221', 'Sykepleiere'],
  ['2222', 'Leger'],
  ['3333', 'Skjult yrke'], // median ve heltidsekv null: dışarıda
  ['0110', 'Offiserer'],
  ['2146', 'Sivilingeniører (geofag, petro-leumsteknologi, metallurgi mv.)'],
  ['2147', 'Sivilingeniører (annet)'], // aynı kısa slug
  ['5555', 'Eiendomsmeglere og - forvaltere'],
];
const SEKTOR = [['6100', 'Stat'], ['6500', 'Kommune'], ['ALLE', 'Alle'], ['A+B+D+E', 'Privat']];
const KJONN = [['0', 'Begge'], ['1', 'Menn'], ['2', 'Kvinner']];
const BASIS = { '0-9': 55000, 2: 60000, '3_01-03': 61000, 2221: 58000, 2222: 90000, 2146: 80000, 2147: 80000, '0110': 88000, 5555: 70000, '0000': 40000, 3333: 1, 21: 1 };
const HV = { '0-9': 2400000, 2: 700000, '3_01-03': 390000, 2221: 90000, 2222: 30000, 2146: 5000, 2147: 4000, '0110': 5000, 5555: 7000, '0000': 5000, 3333: 9, 21: 1 };

const siste = lag(
  [
    ['MaaleMetode', [['01', 'Median'], ['02', 'Snitt'], ['11', 'Heltidsekv'], ['051', 'Nedre'], ['061', 'Øvre']]],
    ['Yrke', YRKER],
    ['Sektor', SEKTOR],
    ['Kjonn', KJONN],
    ['AvtaltVanlig', [['0', 'I alt']]],
    ['ContentsCode', [['Manedslonn', 'Månedslønn']]],
    ['Tid', [['2025', '2025']]],
  ],
  (r) => {
    if (r.Yrke === '3333') return null;
    // Stat ve kommune birçok yerde bastırılmış
    if ((r.Sektor === '6100' || r.Sektor === '6500') && r.Yrke !== '0-9' && r.Yrke !== '2222') return null;
    const kj = { 0: 1, 1: 1.1, 2: 0.9 }[r.Kjonn];
    if (r.MaaleMetode === '11') return Math.round(HV[r.Yrke] * { 0: 1, 1: 0.4, 2: 0.6 }[r.Kjonn] * (r.Sektor === 'ALLE' ? 1 : 0.3));
    const f = { '01': 1, '02': 1.1, '051': 0.85, '061': 1.2 }[r.MaaleMetode];
    return Math.round(BASIS[r.Yrke] * kj * f * (r.Sektor === 'ALLE' ? 1 : 0.95));
  },
);
const serie = lag(
  [
    ['MaaleMetode', [['01', 'Median']]],
    ['Yrke', YRKER],
    ['Sektor', [['ALLE', 'Alle']]],
    ['Kjonn', [['0', 'Begge']]],
    ['AvtaltVanlig', [['0', 'I alt']]],
    ['ContentsCode', [['Manedslonn', 'Månedslønn']]],
    ['Tid', [['2015', '2015'], ['2016', '2016'], ['2024', '2024'], ['2025', '2025']]],
  ],
  (r) => (r.Yrke === '2221' && r.Tid === '2024' ? null : BASIS[r.Yrke] - (2025 - Number(r.Tid)) * 100),
);

test('rensEtikett og gruppeAv', () => {
  assert.equal(rensEtikett('Sivilingeniører (geofag, petro-leumsteknologi)'), 'Sivilingeniører (geofag, petroleumsteknologi)');
  assert.equal(rensEtikett('Eiendomsmeglere og - forvaltere'), 'Eiendomsmeglere og -forvaltere');
  assert.equal(gruppeAv('2221'), '2');
  assert.equal(gruppeAv('3117'), '3_01-03');
  assert.equal(gruppeAv('0110'), '3_01-03');
});

test('lonnData: koder, alle-yrker-median, kjønn, sektor, kvartiler, null bevares', () => {
  const d = lonnData(siste, serie);
  assert.equal(d.sisteAar, '2025');
  assert.equal(d.oppdatert, '2026-08-28T06:00:00Z');
  const koder = d.yrker.map((y) => y.kode);
  assert.ok(!koder.includes('21'), '2-sifret gruppe er ikke med');
  assert.ok(!koder.includes('0000'), 'uoppgitt er ikke med');
  assert.ok(!koder.includes('3333'), 'helt skjult yrke er ikke med');
  const alle = d.yrker.find((y) => y.kode === ALLE);
  assert.equal(alle.navn, 'Alle yrker');
  assert.equal(alle.median, 55000);
  const l = d.yrker.find((y) => y.kode === '2222');
  assert.equal(l.median, 90000);
  assert.equal(l.menn, 99000);
  assert.equal(l.kvinner, 81000);
  assert.equal(l.heltidsekv, 30000);
  assert.equal(l.kvinnerHv, 18000);
  assert.ok(l.nedre < l.median && l.ovre > l.median);
  assert.notEqual(l.sektor.stat, null);
  const sy = d.yrker.find((y) => y.kode === '2221');
  assert.equal(sy.sektor.stat, null, 'undertrykt celle er null, ikke 0');
  assert.equal(sy.sektor.kommune, null);
  assert.notEqual(sy.sektor.privat, null);
  assert.equal(sy.serie['2024'], null);
  assert.equal(sy.serie['2025'], 58000);
  assert.ok(!('2015' in sy.serie), 'serien starter i 2016');
  assert.equal(d.yrker.find((y) => y.kode === '5555').navn, 'Eiendomsmeglere og -forvaltere');
});

test('lonnData: uten serie, og uten «Alle yrker» feiler høyt', () => {
  const d = lonnData(siste);
  assert.deepEqual(d.yrker[0].serie, {});
  const uten = lag([['MaaleMetode', [['01', 'M']]], ['Yrke', [['2222', 'Leger']]], ['Sektor', [['ALLE', 'A']]], ['Kjonn', [['0', 'B']]], ['Tid', [['2025', '2025']]]], () => 1);
  assert.throws(() => lonnData(uten), /Alle yrker/);
});

test('lonnSider: terskel, rekkefølge, slug-kollisjon', () => {
  const d = lonnData(siste, serie);
  const alle = lonnSider(d);
  assert.deepEqual(alle.map((s) => s.kode).sort(), ['0110', '2146', '2147', '2221', '2222', '5555']);
  const topp2 = lonnSider(d, { topp: 2 });
  assert.deepEqual(topp2.map((s) => s.kode).sort(), ['2221', '2222']);
  assert.equal(alle.find((s) => s.kode === '2146').slug, 'sivilingeniorer-2146');
  assert.equal(alle.find((s) => s.kode === '2147').slug, 'sivilingeniorer-2147');
  assert.equal(alle.find((s) => s.kode === '2222').slug, 'leger');
  assert.equal(alle.find((s) => s.kode === '5555').slug, 'eiendomsmeglere-og-forvaltere');
  const navn = alle.map((s) => s.navn);
  assert.deepEqual(navn, [...navn].sort((a, b) => a.localeCompare(b, 'nb')));
});

test('komprimer: sider uendret, detaljer bare der de trengs', () => {
  const d = lonnData(siste, serie);
  const k = komprimer(d);
  assert.deepEqual(lonnSider(k), lonnSider(d));
  assert.ok(k.yrker.find((x) => x.kode === '2221').serie, 'side-yrker beholder alt');
  const tom = komprimer({ ...d, yrker: [...d.yrker, { ...d.yrker.find((x) => x.kode === '2221'), kode: "9999", navn: "Lite yrke", heltidsekv: 10 }] }, { topp: 6 });
  const lite = tom.yrker.find((x) => x.kode === '9999');
  assert.equal(lite.serie, undefined);
  assert.equal(lite.median, 58000);
});
