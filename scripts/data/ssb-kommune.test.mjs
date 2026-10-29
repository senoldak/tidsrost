import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aldersgruppe, kommuneData, kommuneSider } from './ssb-kommune.mjs';

// Küçük JSON-stat2 kurucusu (ssb-lonn.test.mjs'teki ile aynı).
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
  return { class: 'dataset', updated: '2026-04-15T06:00:00Z', id, size, dimension, value };
}

const REGION = [
  ['0', 'Hele landet'],
  ['03', 'Oslo'],
  ['11', 'Rogaland'],
  ['0301', 'Oslo - Oslove'],
  ['1103', 'Stavanger'],
  ['1151', 'Utsira'],
  ['1001', 'Kristiansand (-2019)'], // eski kod: son yılda folketall 0
  ['1199', 'Uoppgitt kommune Rogaland'], // xx99: dışarıda
];
const FOLK = { 0: 1000, '03': 400, 11: 600, '0301': 400, '1103': 590, '1151': 10, 1001: 0, 1199: 5 };

const t06913 = lag(
  [
    ['Region', REGION],
    ['ContentsCode', [['Folkemengde', 'Befolkning'], ['Levende', 'Født'], ['Dode', 'Døde'], ['Fodselsoverskudd', 'Overskudd'], ['Innflyttinger', 'Inn'], ['Utflyttinger', 'Ut'], ['Nettoinnflytting', 'Netto'], ['Folketilvekst', 'Tilvekst']]],
    ['Tid', [['2015', '2015'], ['2016', '2016'], ['2025', '2025'], ['2026', '2026']]],
  ],
  (r) => {
    const f = FOLK[r.Region];
    if (r.ContentsCode === 'Folkemengde') return r.Tid === '2015' ? f - 100 : r.Tid === '2016' ? f - 50 : f;
    if (r.Tid !== '2025') return null; // 2026: yıl bitmedi
    if (r.Region === '1151' && r.ContentsCode === 'Nettoinnflytting') return null; // bastırılmış hücre
    const bas = { Levende: 10, Dode: 8, Fodselsoverskudd: 2, Innflyttinger: 30, Utflyttinger: 20, Nettoinnflytting: 10, Folketilvekst: 12 }[r.ContentsCode];
    return bas * (r.Region === '0' ? 10 : 1);
  },
);

const ALDER = [['000', '0'], ['017', '17'], ['018', '18'], ['066', '66'], ['067', '67'], ['105+', '105+']];
const t07459 = lag(
  [
    ['Region', REGION],
    ['Kjonn', [['1', 'Menn'], ['2', 'Kvinner']]],
    ['Alder', ALDER],
    ['ContentsCode', [['Personer1', 'Personer']]],
    ['Tid', [['2026', '2026']]],
  ],
  (r) => (r.Region === '1151' && r.Alder === '105+' ? null : 1), // her hücre 1 kişi; Utsira'da 105+ bastırılmış
);

const t11342 = lag(
  [
    ['Region', REGION],
    ['ContentsCode', [['Folkemengde', 'F'], ['ArealKm2', 'Areal'], ['LandArealKm2', 'Landareal'], ['FolkeLandArealKm2', 'Tetthet']]],
    ['Tid', [['2026', '2026']]],
  ],
  (r) => ({ ArealKm2: 120, LandArealKm2: 100, Folkemengde: FOLK[r.Region], FolkeLandArealKm2: 5 })[r.ContentsCode],
);

const t06944 = lag(
  [
    ['Region', [...REGION, ['030101a', 'Delområde']]],
    ['HusholdType', [['0000', 'Alle']]],
    ['ContentsCode', [['InntSkatt', 'Median']]],
    ['Tid', [['2024', '2024']]],
  ],
  (r) => (r.Region === '1151' ? null : 600000),
);

test('aldersgruppe: grenser 17/18 og 66/67', () => {
  assert.equal(aldersgruppe(0), 'barn');
  assert.equal(aldersgruppe(17), 'barn');
  assert.equal(aldersgruppe(18), 'voksne');
  assert.equal(aldersgruppe(66), 'voksne');
  assert.equal(aldersgruppe(67), 'eldre');
  assert.equal(aldersgruppe(105), 'eldre');
});

test('kommuneData: bare gjeldende kommuner, xx99 og utgåtte kommuner er ikke med', () => {
  const d = kommuneData(t07459, t06913, t11342, t06944);
  assert.equal(d.sisteAar, '2026');
  assert.equal(d.endringAar, '2025');
  assert.equal(d.inntektAar, '2024');
  assert.deepEqual(d.kommuner.map((k) => k.kode), ['0301', '1103', '1151']);
  assert.equal(d.oppdatert, '2026-04-15T06:00:00Z');
});

test('kommuneData: felter, serie, andeler, endring, tetthet', () => {
  const d = kommuneData(t07459, t06913, t11342, t06944);
  const st = d.kommuner.find((k) => k.kode === '1103');
  assert.equal(st.navn, 'Stavanger');
  assert.equal(st.fylke, '11');
  assert.equal(st.folkemengde, 590);
  assert.deepEqual(st.serie10, { 2016: 540, 2025: 590, 2026: 590 }, '2015 faller utenfor 10 år');
  // 6 alder × 2 kjønn = 12 personer: 0 og 17 er barn (4), 18 og 66 voksne (4), 67 og 105+ eldre (4)
  assert.deepEqual(st.andel, { barn: 33.3, voksne: 33.3, eldre: 33.3 });
  assert.equal(st.endring.aar, '2025');
  assert.equal(st.endring.fodte, 10);
  assert.equal(st.endring.innflytting, 30);
  assert.equal(st.endring.netto, 10);
  assert.equal(st.areal, 120);
  assert.equal(st.landareal, 100);
  assert.equal(st.tetthet, 5.9);
  assert.equal(st.inntektMedian, 600000);
  assert.equal(d.kommuner.find((k) => k.kode === '0301').navn, 'Oslo - Oslove');
  assert.equal(d.land.navn, 'Norge');
  assert.equal(d.land.folkemengde, 1000);
  assert.equal(d.land.endring.fodte, 100);
  assert.equal(d.fylker['11'].navn, 'Rogaland');
  assert.equal(d.fylker['11'].folkemengde, 600);
});

test('kommuneData: undertrykt (null) celle bevares som null, ikke 0', () => {
  const d = kommuneData(t07459, t06913, t11342, t06944);
  const u = d.kommuner.find((k) => k.kode === '1151');
  assert.equal(u.endring.netto, null);
  assert.equal(u.endring.fodte, 10);
  assert.equal(u.inntektMedian, null);
  assert.deepEqual(u.andel, { barn: 40, voksne: 40, eldre: 20 }, 'bastırılmış 105+ hücresi toplamdan düşer');
});

test('kommuneData: uten inntektstabell og uten kommuner', () => {
  const d = kommuneData(t07459, t06913, t11342);
  assert.equal(d.inntektAar, null);
  assert.equal(d.kommuner[0].inntektMedian, null);
  const tom = lag([['Region', [['0', 'Hele landet']]], ['ContentsCode', [['Folkemengde', 'F']]], ['Tid', [['2026', '2026']]]], () => 5);
  assert.throws(() => kommuneData(t07459, tom, t11342), /ingen kommuner/);
});

test('kommuneSider: slug fra første navn, kollisjon får kode, norske tegn', () => {
  const k = (kode, navn) => ({ kode, navn, fylke: '03' });
  const sider = kommuneSider({
    kommuner: [k('0301', 'Oslo - Oslove'), k('3114', 'Våler (Østfold)'), k('3419', 'Våler (Innlandet)'), k('1103', 'Stavanger'), k('1818', 'Herøy'), k('1515', 'Herøy')],
  });
  const slug = Object.fromEntries(sider.map((s) => [s.kode, s.slug]));
  assert.equal(slug['0301'], 'oslo');
  assert.equal(slug['3114'], 'valer-ostfold');
  assert.equal(slug['3419'], 'valer-innlandet');
  assert.equal(slug['1818'], 'heroy-1818');
  assert.equal(slug['1515'], 'heroy-1515');
  assert.equal(new Set(sider.map((s) => s.slug)).size, sider.length);
  const navn = sider.map((s) => s.navn);
  assert.deepEqual(navn, [...navn].sort((a, b) => a.localeCompare(b, 'nb')));
});
