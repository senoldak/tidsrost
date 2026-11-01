import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './smultring.mjs';

const veri = (rader, valg) => ({ form: 'smultring', tittel: 'Vekter', kilde: { navn: 'SSB' }, enhet: 'Vekt', serier: [{ navn: 'Vekt', punkter: rader.map(([x, y]) => ({ x, y })) }], valg });
const pct = (t) => t.punkter.map((p) => Number(p.midt.replace(/\s|%/g, '').replace(',', '.').replace('\u2212', '-')));

test('smultring: yüzdeler toplamı 100', () => { const s = pct(tegn(veri([['a', 312], ['b', 138], ['c', 105], ['d', 90], ['e', 85], ['f', 60], ['g', 50]]))).reduce((a, b) => a + b, 0); assert.ok(Math.abs(s - 100) <= 0.3, String(s)); });
test('smultring: ilk 5 + Andre', () => { const t = tegn(veri([['a', 6], ['b', 5], ['c', 4], ['d', 3], ['e', 2], ['f', 1], ['g', 1]])); assert.equal(t.punkter.length, 6); assert.match(t.punkter[5].tekst, /^Andre/); });
test('smultring: valg.maks', () => assert.equal(tegn(veri([['a', 3], ['b', 2], ['c', 1]], { maks: 2 })).punkter.length, 3));
test('smultring: 0 dilim çizilmez, tabloda kalır', () => {
  const t = tegn(veri([['a', 3], ['b', 0]]));
  assert.equal((t.svg.match(/data-i=/g) || []).length, 1);
  assert.equal(t.tabell.rader.length, 2);
});
test('smultring: orta metin data-midt', () => assert.match(tegn(veri([['a', 1]])).svg, /data-midt/));
test('smultring: negatif değerin payı tabloda "–"', () => assert.equal(tegn(veri([['a', 3], ['b', -1]])).tabell.rader[1][2], '–'));
