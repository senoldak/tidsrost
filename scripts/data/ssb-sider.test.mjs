import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arbeidsledighet, boligpriser, kpiHistorisk, prisstigning } from './ssb-sider.mjs';

// Küçük JSON-stat2 kurucusu: dims = [[ad, [[kod, etiket], ...]], ...]; deger(satır) → sayı ya da null.
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
  return { class: 'dataset', updated: '2026-10-09T06:00:00Z', id, size, dimension, value };
}

const maaneder = (n) =>
  Array.from({ length: n }, (_, i) => {
    const t = new Date(Date.UTC(2024, 9 + i, 1));
    const k = `${t.getUTCFullYear()}M${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
    return [k, k];
  });

test('prisstigning: siste måned, grupper og serie', () => {
  const tid = maaneder(24); // 2024M10 … 2026M09
  const js = lag(
    [
      ['VareTjenesteGrp', [['00', 'I alt'], ['01', 'Matvarer og alkoholfrie drikkevarer'], ['01.1', 'Matvarer'], ['07', 'Transport']]],
      ['ContentsCode', [['Tolvmanedersendring', '12-måneders endring (prosent)'], ['KpiVektMnd', 'Vekter']]],
      ['Tid', tid],
    ],
    (r) => {
      if (r.ContentsCode === 'KpiVektMnd') return r.VareTjenesteGrp === '00' ? 1000 : 100;
      if (r.VareTjenesteGrp === '07' && r.Tid === '2026M09') return null;
      return r.VareTjenesteGrp === '00' ? (r.Tid === '2026M09' ? 3.4 : 3.0) : 2.4;
    },
  );
  const p = prisstigning(js);
  assert.equal(p.sisteMaaned, '2026-09');
  assert.equal(p.tolvMnd, 3.4);
  assert.equal(p.oppdatert, '2026-10-09T06:00:00Z');
  assert.deepEqual(p.grupper.map((g) => g.kode), ['01', '01.1', '07']);
  assert.deepEqual(p.grupper[1], { kode: '01.1', navn: 'Matvarer', tolvMnd: 2.4, vekt: 100 });
  assert.equal(p.grupper[2].tolvMnd, null);
  assert.equal(p.serie.length, 24);
  assert.deepEqual(p.serie.at(-1), { maaned: '2026-09', tolvMnd: 3.4 });
});

test('prisstigning: hovedtall mangler eller er urimelig → feil', () => {
  const dims = [
    ['VareTjenesteGrp', [['00', 'I alt']]],
    ['ContentsCode', [['Tolvmanedersendring', 'x'], ['KpiVektMnd', 'v']]],
    ['Tid', maaneder(2)],
  ];
  assert.throws(() => prisstigning(lag(dims, () => null)));
  assert.throws(() => prisstigning(lag(dims, (r) => (r.ContentsCode === 'KpiVektMnd' ? 1000 : 45))));
});

const kvartaler = (n) =>
  Array.from({ length: n }, (_, i) => {
    const q = 2023 * 4 + 2 + i; // 2023K3 …
    const k = `${Math.floor(q / 4)}K${(q % 4) + 1}`;
    return [k, k];
  });

test('boligpriser: årsendring per region og serie for hele landet', () => {
  const tid = kvartaler(13); // 2023K3 … 2026K3
  const js = lag(
    [
      ['Region', [['TOTAL', 'Hele landet'], ['001', 'Oslo med Bærum'], ['011', 'Nord-Norge']]],
      ['Boligtype', [['00', 'Alle boligtyper']]],
      ['ContentsCode', [['Boligindeks', 'Prisindeks for brukte boliger']]],
      ['Tid', tid],
    ],
    (r) => {
      if (r.Region === '011' && r.Tid === '2025K3') return null;
      if (r.Tid === '2026K3') return r.Region === 'TOTAL' ? 158.3 : 170.5;
      if (r.Tid === '2025K3') return r.Region === 'TOTAL' ? 150 : 160;
      return 140;
    },
  );
  const b = boligpriser(js);
  assert.equal(b.sisteKvartal, '2026K3');
  assert.equal(b.regioner.length, 3);
  assert.deepEqual(b.regioner[0], { kode: 'TOTAL', navn: 'Hele landet', indeks: 158.3, endringAar: 5.5 });
  assert.equal(b.regioner[1].endringAar, 6.6);
  assert.equal(b.regioner[2].endringAar, null);
  assert.equal(b.serie.length, 12);
  assert.deepEqual(b.serie.at(-1), { kvartal: '2026K3', indeks: 158.3 });
});

test('arbeidsledighet: hovedtall, grupper og serie', () => {
  const tid = maaneder(24);
  const js = lag(
    [
      ['Kjonn', [['0', 'Begge kjønn'], ['2', 'Kvinner'], ['1', 'Menn']]],
      ['Alder', [['15-74', '15-74 år'], ['15-24', '15-24 år'], ['25-74', '25-74 år']]],
      ['Justering', [['S', 'Sesongjustert']]],
      ['ContentsCode', [['ArbledProsArbstyrk', 'Arbeidsledige i prosent av arbeidsstyrken']]],
      ['Tid', tid],
    ],
    (r) => {
      if (r.Kjonn === '0' && r.Alder === '15-74') return r.Tid === '2026M09' ? 5 : 4.5;
      if (r.Kjonn === '0' && r.Alder === '15-24') return 11.2;
      return 4.8;
    },
  );
  const a = arbeidsledighet(js);
  assert.equal(a.sisteMaaned, '2026-09');
  assert.equal(a.prosent, 5);
  assert.deepEqual(a.grupper.map((g) => g.navn), ['Kvinner', 'Menn', '15–24 år', '25–74 år']);
  assert.equal(a.grupper[2].prosent, 11.2);
  assert.equal(a.serie.length, 24);
  assert.deepEqual(a.serie.at(-1), { maaned: '2026-09', prosent: 5 });
});

test('kpiHistorisk: null-hücre atlanır, siste år/måned er siste fylte periode', () => {
  const aarJs = lag(
    [['ContentsCode', [['KpiAar', 'Konsumprisindeks']]], ['Tid', [['1865', '1865'], ['1866', '1866'], ['2025', '2025'], ['2026', '2026']]]],
    (r) => ({ 1865: 4.1, 1866: null, 2025: 100, 2026: null })[r.Tid],
  );
  const mndJs = lag(
    [['ContentsCode', [['KpiIndMnd', 'Konsumprisindeks']]], ['Tid', [['2026M07', 'a'], ['2026M08', 'b'], ['2026M09', 'c'], ['2026M10', 'd']]]],
    (r) => ({ '2026M07': 101, '2026M08': null, '2026M09': 102.5, '2026M10': null })[r.Tid],
  );
  const k = kpiHistorisk(aarJs, mndJs);
  assert.deepEqual(k.aar, { 1865: 4.1, 2025: 100 });
  assert.deepEqual(k.mnd, { '2026-07': 101, '2026-09': 102.5 });
  assert.equal(k.sisteAar, '2025');
  assert.equal(k.sisteMnd, '2026-09');
  assert.equal(k.oppdatert, '2026-10-09T06:00:00Z');
});

test('kpiHistorisk: ingen verdier → feil', () => {
  const tom = lag([['ContentsCode', [['KpiAar', 'x']]], ['Tid', [['2025', '2025']]]], () => null);
  assert.throws(() => kpiHistorisk(tom, tom));
});
