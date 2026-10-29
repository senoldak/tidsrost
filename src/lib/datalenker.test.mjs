import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datasiderFor } from './datalenker.mjs';

test('datasiderFor: sak om KPI peker til prisstigning, sak om renten til styringsrenten', () => {
  assert.deepEqual(datasiderFor('Konsumprisindeksen steg 3,4 prosent').map((d) => d.url), ['/prisstigning/']);
  assert.deepEqual(datasiderFor('Norges Bank hever styringsrenten til 4,5 prosent').map((d) => d.url), ['/styringsrenten/']);
  assert.deepEqual(datasiderFor('Boligprisene falt i Oslo').map((d) => d.url), ['/boligpriser/']);
  assert.deepEqual(datasiderFor('Arbeidsledigheten økte til 5 prosent ifølge AKU').map((d) => d.url), ['/arbeidsledighet/']);
  assert.deepEqual(datasiderFor('Oransje farevarsel for kraftig regn i Vestland').map((d) => d.url), ['/farevarsler/']);
});

test('datasiderFor: høyst to, i rekkefølgen de nevnes oftest; ingen treff gir tom liste', () => {
  const t = 'Styringsrenten og prisveksten: KPI, inflasjon og renten. Boligprisene også.';
  assert.equal(datasiderFor(t).length, 2);
  assert.deepEqual(datasiderFor(t).map((d) => d.url), ['/prisstigning/', '/styringsrenten/']);
  assert.deepEqual(datasiderFor('Fotballkamp i Bergen'), []);
  assert.deepEqual(datasiderFor(''), []);
});
