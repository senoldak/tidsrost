import test from 'node:test';
import assert from 'node:assert/strict';
import { finnOrd, former } from './ordforklaring.mjs';

const ordbok = {
  ord: {
    trusselbilde: 'forestilling av hva som kan true et land eller en gruppe',
    fagmiljø: 'gruppe av personer som arbeider med samme fag',
    tilsyn: 'overvåking, kontroll, inspeksjon',
    vikar: 'person som midlertidig tar over en stilling',
    avdrag: 'sum som en betaler av på en gjeld',
  },
};

test('bøyd form gir oppslagsordet', () => {
  const r = finnOrd('Trusselbildet har endret seg.', ordbok);
  assert.equal(r.length, 1);
  assert.equal(r[0].lemma, 'trusselbilde');
  assert.equal(r[0].ord, 'Trusselbildet');
  assert.match(r[0].def, /forestilling/);
});

test('fagmiljøer gir fagmiljø', () => {
  assert.equal(finnOrd('Flere fagmiljøer advarer.', ordbok)[0].lemma, 'fagmiljø');
});

test('ord som ikke er i ordboka gir ingen treff', () => {
  assert.deepEqual(finnOrd('En kompromittert server ble funnet.', ordbok), []);
});

test('maks tre, fjerde returneres ikke, tekstrekkefølge', () => {
  const r = finnOrd('Vikaren, tilsynet, avdraget og trusselbildet.', ordbok);
  assert.deepEqual(r.map((x) => x.lemma), ['vikar', 'tilsyn', 'avdrag']);
});

test('første forekomst per oppslagsord', () => {
  const r = finnOrd('Tilsyn her. Tilsynet der. Tilsyn igjen.', ordbok);
  assert.equal(r.length, 1);
  assert.equal(r[0].start, 0);
});

test('aldri inne i et annet ord', () => {
  assert.deepEqual(finnOrd('Vikarbyrå og avdragsfri og fagmiljøforskning og e-tilsyn.', ordbok), []);
  assert.deepEqual(finnOrd('Nettilsyn og tilsynsrådet.', ordbok), []);
});

test('former for ord på -e', () => {
  const f = former('trusselbilde');
  for (const x of ['trusselbilde', 'trusselbildet', 'trusselbilder', 'trusselbildene', 'trusselbilda']) assert.ok(f.has(x), x);
});
