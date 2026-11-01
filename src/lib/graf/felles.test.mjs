import test from 'node:test';
import assert from 'node:assert/strict';
import { fineTikker, skala, tall, kortNavn, esc, sti, trappSti, kortEnhet, tikkDesimaler } from './felles.mjs';

test('fineTikker: düz seri NaN üretmez', () => { const t = fineTikker(5, 5); assert.ok(t.length >= 2 && t.every(Number.isFinite)); });
test('fineTikker: 0–5,2 → 0..6', () => assert.deepEqual(fineTikker(0, 5.2), [0, 2, 4, 6]));
test('skala: doğrusal', () => assert.equal(skala(0, 10, 100, 0)(5), 50));
test('tall: nb-NO', () => { assert.equal(tall(3.4), '3,4'); assert.equal(tall(55800, 0), '55\u00a0800'); assert.equal(tall(-1.1), '−1,1'); });
test('sti: null keser', () => assert.equal(sti([{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }]), 'M0 1M2 3'));
test('trappSti: H/V', () => assert.equal(trappSti([{ x: 0, y: 1 }, { x: 2, y: 3 }]), 'M0 1H2V3'));
test('kortNavn', () => { assert.equal(kortNavn('Møre og Romsdal og Vestland uten Bergen', 20), 'Møre og Romsdal og …'); assert.equal(kortNavn('Oslo', 20), 'Oslo'); });
test('esc', () => assert.equal(esc('<a & "b">'), '&lt;a &amp; &quot;b&quot;&gt;'));
test('kortEnhet', () => {
  assert.equal(kortEnhet('Tolvmånedersendring i KPI, prosent'), ' %');
  assert.equal(kortEnhet('Kroner per måned'), ' kr');
  assert.equal(kortEnhet('Indeks (2015 = 100)'), '');
});
test('tikkDesimaler: adımdan ondalık', () => {
  assert.equal(tikkDesimaler([4, 4.25, 4.5]), 2);
  assert.equal(tikkDesimaler([0, 2, 4]), 0);
  assert.equal(tikkDesimaler([0, 0.5, 1]), 1);
  assert.equal(tikkDesimaler([0.01, 0.02]), 2);
});
test('fineTikker: sonlu olmayan girdi hata atar, yığın taşmaz', () => assert.throws(() => fineTikker(Infinity, -Infinity), /sonlu/));
