import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './helning.mjs';

const veri = (rader) => ({ form: 'helning', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Indeks', serier: rader.map(([navn, a, b]) => ({ navn, punkter: [{ x: 'I fjor', y: a }, { x: 'Nå', y: b }] })) });

test('helning: en çok artan su, en çok düşen kırmızı', () => {
  const s = tegn(veri([['A', 100, 110], ['B', 100, 95], ['C', 100, 101]])).svg;
  assert.match(s, /<g data-i="0" class="g-helning g-su-vurgu">/);
  assert.match(s, /<g data-i="1" class="g-helning g-rod-vurgu">/);
  assert.match(s, /<g data-i="2" class="g-helning">/);
});
test('helning: yalnız vurgulular etiketli', () => { const s = tegn(veri([['Aaa', 1, 2], ['Bbb', 2, 1], ['Ccc', 1, 1.1]])).svg; assert.ok(s.includes('>Aaa<') && s.includes('>Bbb<') && !s.includes('>Ccc<')); });
test('helning: aynı değerde bölme hatası yok', () => assert.ok(!tegn(veri([['A', 0, 0], ['B', 0, 0]])).svg.includes('NaN')));
test('helning: ipucu değişimi verir', () => assert.match(tegn(veri([['A', 100, 110]])).punkter[0].tekst, /100,0 → 110,0/));
