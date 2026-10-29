import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SSB_KILDE, lesJsonStat2, ssbUrl } from './ssb.mjs';

test('ssbUrl: tablo, valueCodes ve json-stat2', () => {
  const url = ssbUrl('13760', { Kjonn: '0', Alder: ['15-24', '25-74'], Tid: 'top(3)' });
  assert.ok(url.startsWith('https://data.ssb.no/api/pxwebapi/v2/tables/13760/data?'));
  assert.ok(url.includes('lang=no'));
  assert.ok(url.includes('outputFormat=json-stat2'));
  assert.ok(url.includes('valueCodes[Kjonn]=0'));
  assert.ok(url.includes('valueCodes[Alder]=15-24,25-74'));
  assert.ok(url.includes('valueCodes[Tid]=top(3)'));
});

const ornek = {
  class: 'dataset',
  updated: '2026-10-12T06:00:00Z',
  id: ['Region', 'Tid'],
  size: [2, 2],
  dimension: {
    Region: { category: { index: { TOTAL: 0, '001': 1 } } },
    Tid: { category: { index: { '2026K2': 0, '2026K3': 1 } } },
  },
  value: [100, 101.5, null, 103],
};

test('lesJsonStat2: düz satırlar, son boyut en hızlı değişir, null korunur', () => {
  const { oppdatert, rader } = lesJsonStat2(ornek);
  assert.equal(oppdatert, '2026-10-12T06:00:00Z');
  assert.equal(rader.length, 4);
  assert.deepEqual(rader[0], { Region: 'TOTAL', Tid: '2026K2', verdi: 100 });
  assert.deepEqual(rader[1], { Region: 'TOTAL', Tid: '2026K3', verdi: 101.5 });
  assert.deepEqual(rader[2], { Region: '001', Tid: '2026K2', verdi: null });
  assert.deepEqual(rader[3], { Region: '001', Tid: '2026K3', verdi: 103 });
});

test('lesJsonStat2: dataset değilse ya da value yoksa hata', () => {
  assert.throws(() => lesJsonStat2({ class: 'collection' }));
  assert.throws(() => lesJsonStat2({ ...ornek, value: undefined }));
  assert.throws(() => lesJsonStat2(null));
});

test('SSB_KILDE: lisans NLOD', () => {
  assert.equal(SSB_KILDE.lisens, 'NLOD');
});
