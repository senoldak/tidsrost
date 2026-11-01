import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './baand.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (rader, linje) => ({ form: 'baand', tittel: 't', kilde: { navn: 'Norges Bank' }, enhet: 'Prosent', serier: [{ navn: 'Usikkerhet', punkter: rader.map(([x, y, y2]) => ({ x, y, y2 })) }, ...(linje ? [{ navn: 'Rentebane', punkter: linje.map(([x, y]) => ({ x, y })) }] : [])] });

test('baand: y2 eksikse hata', () => assert.match(validerGraf(veri([['a', 1, undefined]])).join(), /y2/));
test('baand: kapalı bant yolu', () => assert.match(tegn(veri([['a', 1, 2], ['b', 1.5, 3]])).svg, /class="g-baand"[^>]*d="M[^"]*Z"/));
test('baand: null noktada bant bölünür', () => assert.equal((tegn(veri([['a', 1, 2], ['b', null, null], ['c', 1, 2], ['d', 1, 2]])).svg.match(/class="g-baand"/g) || []).length, 2));
test('baand: çizgi ve ipucu', () => {
  const t = tegn(veri([['a', 1, 3], ['b', 2, 4]], [['a', 2], ['b', 3]]));
  assert.equal(t.modus, 'serie');
  assert.equal(t.punkter[0].tekst, 'a\nRentebane: 2,0 %\nUsikkerhet: 1,0–3,0 %');
});
