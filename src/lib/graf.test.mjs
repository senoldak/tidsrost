import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fineTikker, linjeSti, skala, trinnSti, tallTekst } from './graf.mjs';

test('skala: lineær avbildning', () => {
  assert.equal(skala(0, 10, 100)(5), 50);
  assert.equal(skala(0, 10, 100)(0), 0);
  assert.equal(skala(2, 2, 100)(2), 50); // flat serie havner midt i
});

test('fineTikker: steg på 1, 2 eller 5 × 10ⁿ som dekker området', () => {
  assert.deepEqual(fineTikker(0, 4.6), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(fineTikker(3.1, 5.2), [3, 3.5, 4, 4.5, 5, 5.5]);
  assert.deepEqual(fineTikker(140, 162), [140, 145, 150, 155, 160, 165]);
  assert.deepEqual(fineTikker(0, 0), [0, 1]);
});

test('linjeSti og trinnSti', () => {
  assert.equal(linjeSti([{ x: 0, y: 0 }, { x: 10, y: 5 }]), 'M0 0L10 5');
  assert.equal(trinnSti([{ x: 0, y: 10 }, { x: 5, y: 4 }, { x: 9, y: 4 }]), 'M0 10H5V4H9');
  assert.equal(linjeSti([]), '');
});

test('tallTekst: norsk desimalkomma', () => {
  assert.equal(tallTekst(3.4), '3,4');
  assert.equal(tallTekst(-0.25, 2), '−0,25');
  assert.equal(tallTekst(158.3), '158,3');
});
