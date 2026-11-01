import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './manual.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (rader, valg = { gruppenavn: ['Kvinner', 'Menn'] }) => ({ form: 'manual', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Kroner', desimaler: 0, serier: [{ navn: 'Lønn', punkter: rader.map(([x, y, y2]) => ({ x, y, y2 })) }], valg });

test('manual: y2 eksikse hata', () => assert.match(validerGraf(veri([['A', 1]])).join(), /y2/));
test('manual: gruppenavn eksikse hata', () => assert.match(validerGraf(veri([['A', 1, 2]], {})).join(), /gruppenavn/));
test('manual: iki nokta ve fark ipucunda', () => {
  const t = tegn(veri([['Ledere', 71930, 83080]]));
  assert.equal((t.svg.match(/<g data-i="0">(.*?)<\/g>/)[1].match(/<circle/g) || []).length, 2);
  assert.match(t.punkter[0].tekst, /Forskjell 11\u00a0150 kr/);
});
test('manual: y2 büyükten küçüğe sıralı', () => assert.match(tegn(veri([['A', 1, 2], ['B', 1, 5]])).punkter[0].tekst, /^B/));
test('manual: aynı değerli satırda NaN yok', () => assert.ok(!tegn(veri([['A', 3, 3]])).svg.includes('NaN')));
