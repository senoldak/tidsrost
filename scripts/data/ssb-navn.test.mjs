import { test } from 'node:test';
import assert from 'node:assert/strict';
import { komprimer, kjonnFraKode, navnData, navnSider, navnVisning } from './ssb-navn.mjs';

// Küçük JSON-stat2 kurucusu (ssb-sider.test.mjs'teki ile aynı).
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
  return { class: 'dataset', updated: '2026-01-28T07:00:00Z', id, size, dimension, value };
}

const aarRekke = (fra, til) => Array.from({ length: til - fra + 1 }, (_, i) => [String(fra + i), String(fra + i)]);
// Alex hem jente hem gutt; Anne-Marie 2021–2024 null (SSB tirelli adları o yıllar göstermiyor); Åse; Rare kısa doğum serisi
const NAVN = [['1ANNE-MARIE', 'ANNE-MARIE'], ['1ASE', 'Åse'], ['1ALEX', 'Alex'], ['2ALEX', 'Alex'], ['2OLA', 'Ola'], ['2RARE', 'Rare']];
const BASE = { '1ANNE-MARIE': 900, '1ASE': 500, '1ALEX': 300, '2ALEX': 400, '2OLA': 2000, '2RARE': 210 };
const p = lag(
  [['Fornavn', NAVN], ['ContentsCode', [['Personer', 'Personer']]], ['Tid', aarRekke(2013, 2025)]],
  (r) => {
    if (r.Fornavn === '1ANNE-MARIE' && Number(r.Tid) >= 2021 && Number(r.Tid) <= 2024) return null;
    return BASE[r.Fornavn] + (Number(r.Tid) - 2013);
  },
);
const f = lag(
  [['Fornavn', NAVN.concat([['1GAMMEL', 'Gammel']])], ['ContentsCode', [['Personer', 'Personer'], ['PersonerProsent', '%']]], ['Tid', aarRekke(1950, 2025)]],
  (r) => {
    if (r.ContentsCode !== 'Personer') return 1;
    if (r.Fornavn === '2RARE') return Number(r.Tid) > 2020 ? 10 : null;
    if (Number(r.Tid) < 1953) return null;
    return 20 + (r.Fornavn === '1GAMMEL' ? 0 : 1);
  },
);
const e = lag(
  [['Etternavn', [['HANSEN', 'HANSEN'], ['JOHANSEN', 'JOHANSEN'], ['SJELDEN', 'SJELDEN']]], ['ContentsCode', [['Personer', 'Personer']]], ['Tid', [['2025', '2025']]]],
  (r) => ({ HANSEN: 50000, JOHANSEN: 52000, SJELDEN: null })[r.Etternavn],
);

test('navnVisning: SSB-etikett med store bokstaver og tegn', () => {
  assert.equal(navnVisning('ANNE-MARIE'), 'Anne-Marie');
  assert.equal(navnVisning('ØRJAN'), 'Ørjan');
  assert.equal(navnVisning('Åse'), 'Åse');
  assert.equal(navnVisning('Ola'), 'Ola');
  assert.equal(kjonnFraKode('1ADA'), 'J');
  assert.equal(kjonnFraKode('2AARON'), 'G');
  assert.equal(kjonnFraKode('9X'), null);
});

test('navnData: kjønn fra kode, null-hull bevares, antall = siste år', () => {
  const d = navnData(p, f, e);
  assert.equal(d.sisteAar, '2025');
  assert.equal(d.oppdatert, '2026-01-28T07:00:00Z');
  const am = d.fornavn.find((n) => n.navn === 'Anne-Marie');
  assert.equal(am.kjonn, 'J');
  assert.equal(am.antall, 912);
  assert.equal(am.serie['2022'], undefined);
  assert.equal(am.serie['2020'], 907);
  assert.equal(am.fodte['1950'], undefined);
  assert.equal(am.fodte['1953'], 21);
  // Yalnız 10467'de olan ad: antall null
  const g = d.fornavn.find((n) => n.navn === 'Gammel');
  assert.equal(g.antall, null);
  assert.equal(g.fodte['2025'], 20);
  // SSB'nin bastırdığı soyadı (null) listeye girmez
  assert.deepEqual(d.etternavn, [{ navn: 'Johansen', antall: 52000 }, { navn: 'Hansen', antall: 50000 }]);
});

test('navnSider: terskel, topp-N, kort serie dışarıda, çakışma sluğu', () => {
  const d = navnData(p, f, e);
  const s = navnSider(d, { topp: 150, minAar: 20 });
  assert.ok(!s.some((x) => x.navn === 'Rare'), 'kort serie faller ut');
  assert.ok(!s.some((x) => x.navn === 'Gammel'), 'uten antall faller ut');
  assert.deepEqual(s.filter((x) => x.navn === 'Alex').map((x) => x.slug).sort(), ['alex-gutt', 'alex-jente']);
  assert.equal(s.find((x) => x.navn === 'Ola').slug, 'ola');
  assert.equal(s.find((x) => x.navn === 'Åse').slug, 'ase');
  assert.equal(s.find((x) => x.navn === 'Anne-Marie').slug, 'anne-marie');
  const topp1 = navnSider(d, { topp: 1, minAar: 20 });
  assert.deepEqual(topp1.map((x) => x.navn).sort(), ['Anne-Marie', 'Ola']);
});

test('komprimer: sideliste uendret, sidenavn beholder fødte', () => {
  const d = navnData(p, f, e);
  const k = komprimer(d);
  assert.deepEqual(navnSider(k), navnSider(d));
  const alex = k.fornavn.find((n) => n.navn === 'Alex' && n.kjonn === 'G');
  assert.ok(Object.keys(alex.fodte).length > 1);
  const rare = k.fornavn.find((n) => n.navn === 'Rare');
  assert.deepEqual(Object.keys(rare.fodte), ['2025']);
  assert.deepEqual(rare.serie, {});
});
