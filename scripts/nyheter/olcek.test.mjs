import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sjekkSkala, sjekkTall } from './redaktor.mjs';

test('sjekkSkala: millioner skrevet som milliarder blir funnet', () => {
  const p = sjekkSkala('Regjeringen gir 150 milliarder kroner.', 'Regjeringen gir 150 millioner kroner til glemte kriser.');
  assert.equal(p.length, 1);
  assert.match(p[0], /Feil størrelsesorden/);
  assert.ok(sjekkTall('Regjeringen gir 150 milliarder kroner.', 'Regjeringen gir 150 millioner kroner.').some((x) => x.startsWith('Feil størrelsesorden')));
});

test('sjekkSkala: riktig omregning, intervall og norsk billion (10^12) gir ingen feil', () => {
  assert.deepEqual(sjekkSkala('3,58 milliarder kroner', 'Totalt 3 580 millioner kroner'), []);
  assert.deepEqual(sjekkSkala('opp mot 100 til 115 milliarder kroner', 'over 10 milliarder dollar, 100 til 115 milliarder kroner'), []);
  assert.deepEqual(sjekkSkala('2 billioner kroner', 'Fondet er på 2 000 milliarder kroner'), []);
});
