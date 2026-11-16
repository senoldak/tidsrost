// Eğim emekli: 'helning' verisi halter olarak çizilir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './helning.mjs';

const d = {
  tittel: 'T', enhet: '', desimaler: 0, kilde: { navn: 'K' }, form: 'helning',
  serier: [
    { navn: 'A', punkter: [{ x: '2023', y: 98 }, { x: '2024', y: 181 }] },
    { navn: 'B', punkter: [{ x: '2023', y: 159 }, { x: '2024', y: 229 }] },
    { navn: 'C', punkter: [{ x: '2023', y: 30 }, { x: '2024', y: null }] },
  ],
};

test('helning: eğim çizgisi yok, halter satırları var', () => {
  const t = tegn(d);
  assert.ok(!t.svg.includes('g-helning'));
  assert.ok(t.svg.includes('g-manual'));
});
test('helning: her seri bir satır, eksik değerli seri düşer, büyükten küçüğe', () => {
  const t = tegn(d);
  assert.deepEqual(t.tabell.kolonner.slice(0, 3), ['', '2023', '2024']);
  assert.deepEqual(t.tabell.rader.map((r) => r[0]), ['B', 'A']);
});
test('halter lejantı: ikinci öğe birinci yazıyla çakışmaz', () => {
  const uzun = { ...d, serier: d.serier.map((s) => ({ ...s, punkter: s.punkter.map((p, i) => ({ ...p, x: i ? '2024 yılı verisi' : '2023 yılı verisi' })) })) };
  const svg = tegn(uzun).svg;
  const x = [...svg.matchAll(/<circle cx="([\d.]+)" cy="9"/g)].map((m) => Number(m[1]));
  assert.ok(x[1] - x[0] >= 14 + '2023 yılı verisi'.length * 7, `aralık ${x[1] - x[0]}`);
});
