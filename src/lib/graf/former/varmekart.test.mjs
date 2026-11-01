import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn as varmekart } from './varmekart.mjs';
import { tegn as stripe } from './stripe.mjs';

const vk = (rader) => ({ form: 'varmekart', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: rader.map(([navn, ys]) => ({ navn, punkter: ys.map((y, i) => ({ x: `m${i}`, y })) })) });
const st = (ys) => ({ form: 'stripe', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'KPI', punkter: ys.map((y, i) => ({ x: String(2000 + i), y })) }] });
const sinif = (svg, i) => svg.match(new RegExp(`data-i="${i}"[^>]*class="(g-[a-z0-9-]+)"`))[1];

test('varmekart: en büyük g-v5, en küçük g-v1, null g-v0', () => {
  const s = varmekart(vk([['a', [1, 5]], ['b', [null, 3]]])).svg;
  assert.equal(sinif(s, 0), 'g-v1');
  assert.equal(sinif(s, 1), 'g-v5');
  assert.equal(sinif(s, 2), 'g-v0');
});
test('varmekart: hücre sayısı ve ipucu satır+sütun', () => {
  const t = varmekart(vk([['a', [1, 2]], ['b', [3, 4]]]));
  assert.equal(t.punkter.length, 4);
  assert.equal(t.punkter[3].tekst, 'b, m1\n4,0 %');
});
test('varmekart: hepsi aynı değer NaN yok', () => assert.ok(!varmekart(vk([['a', [2, 2]], ['b', [2, 2]]])).svg.includes('NaN')));
test('stripe: ortalamaya eşit g-d0, uçlar g-d3 / g-d-3', () => {
  const s = stripe(st([1, 2, 3])).svg;
  assert.equal(sinif(s, 1), 'g-d0');
  assert.equal(sinif(s, 2), 'g-d3');
  assert.equal(sinif(s, 0), 'g-d-3');
});
test('stripe: 160 yıl, öğe başına ipucu', () => { const t = stripe(st(Array.from({ length: 160 }, (_, i) => Math.sin(i)))); assert.equal(t.punkter.length, 160); assert.ok(!t.svg.includes('NaN')); });
