import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliserKilder, kildelinje } from './kilder.mjs';

test('normaliserKilder: samme medium to ganger, http og utm_', () => {
  assert.deepEqual(
    normaliserKilder([{ navn: 'NRK', url: 'http://nrk.no/a?utm_source=x' }, { navn: 'NRK', url: 'https://nrk.no/a' }]),
    [{ navn: 'NRK', url: 'https://nrk.no/a' }],
  );
});

test('normaliserKilder: samme adresse under to navn, tomme og ugyldige', () => {
  const r = normaliserKilder([
    { navn: 'A', url: 'https://a.example/x?id=1&utm_medium=y' },
    { navn: 'B', url: 'https://a.example/x?id=1' },
    { navn: '', url: 'https://c.example/' },
    { navn: 'D', url: '' },
    { navn: 'E', url: 'ikke en url' },
    { navn: 'F', url: 'javascript:alert(1)' },
    { navn: 'G', url: 'https://g.example/' },
  ]);
  assert.deepEqual(r, [{ navn: 'A', url: 'https://a.example/x?id=1' }, { navn: 'G', url: 'https://g.example/' }]);
});

test('normaliserKilder: norske bokstaver og rekkefølge bevares, lisens følger med', () => {
  const r = normaliserKilder([
    { navn: 'Østlandets Blad', url: 'https://oest.example/sak?by=Ålesund&utm_campaign=z' },
    { navn: 'Norges Bank', url: 'https://www.norges-bank.no/', lisens: 'NLOD' },
  ]);
  assert.equal(r[0].navn, 'Østlandets Blad');
  assert.equal(new URL(r[0].url).searchParams.get('by'), 'Ålesund');
  assert.ok(!r[0].url.includes('utm_'));
  assert.deepEqual(r[1], { navn: 'Norges Bank', url: 'https://www.norges-bank.no/', lisens: 'NLOD' });
  assert.deepEqual(normaliserKilder(undefined), []);
});

const k = (n) => Array.from({ length: n }, (_, i) => ({ navn: i ? `M${i}` : 'Avis A', url: `https://m${i}.example/` }));

test('kildelinje ki-medier', () => {
  assert.equal(kildelinje(k(1), 'ki-medier'), 'Bygger på en sak fra Avis A.');
  assert.equal(kildelinje(k(2), 'ki-medier'), 'Bygger på saker fra Avis A og ett annet medium.');
  assert.equal(kildelinje(k(3), 'ki-medier'), 'Bygger på saker fra Avis A og to andre medier.');
  assert.equal(kildelinje(k(5), 'ki-medier'), 'Bygger på saker fra Avis A og fire andre medier.');
  assert.equal(kildelinje(k(11), 'ki-medier'), 'Bygger på saker fra Avis A og ti andre medier.');
  assert.equal(kildelinje(k(12), 'ki-medier'), 'Bygger på saker fra Avis A og 11 andre medier.');
  assert.equal(kildelinje([], 'ki-medier'), 'Kildene ble ikke lagret for denne saken.');
  assert.equal(kildelinje(undefined, 'ki-medier'), 'Kildene ble ikke lagret for denne saken.');
});

test('kildelinje andre typer', () => {
  for (const p of ['ki-kontrollert', 'ki-automatisk', 'automatisk']) {
    assert.equal(kildelinje([{ navn: 'SSB', url: 'https://www.ssb.no/' }], p), 'Bygger på en melding fra SSB.');
    assert.equal(kildelinje([], p), null);
  }
  for (const p of ['manuell', 'ki-redigert', 'ki-assistert']) assert.equal(kildelinje(k(3), p), null);
});
