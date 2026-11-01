import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './rangering.mjs';

const rangVeri = (rader, valg) => ({ form: 'rangering', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Endring', punkter: rader.map(([x, y]) => ({ x, y })) }], valg });

test('rangering: sıralı, uzun ad kısalır, tam ad ipucunda', () => {
  const t = tegn(rangVeri([['Oslo', 0.1], ['Møre og Romsdal og Vestland uten Bergen og litt til', 7.1]]));
  assert.match(t.svg, /…/);
  assert.match(t.punkter[0].tekst, /Møre og Romsdal og Vestland uten Bergen og litt til/);
});
test('rangering: sorter:false sırayı korur', () => assert.match(tegn(rangVeri([['A', 1], ['B', 2]], { sorter: false })).punkter[0].tekst, /^A/));
test('rangering: null satır "–", çubuk yok', () => {
  const t = tegn(rangVeri([['A', null], ['B', 2]]));
  assert.equal(t.tabell.rader.find((r) => r[0] === 'A')[1], '–');
  assert.equal((t.svg.match(/<rect/g) || []).length, 2); // B çubuğu + A'nın görünmez satır alanı
});
test('rangering: fremhev', () => { const s = tegn(rangVeri([['A', 1], ['B', 2]], { fremhev: ['A'] })).svg; assert.match(s, /g-f-su"/); assert.match(s, /g-f-su2/); });
test('rangering: negatif çubuk sıfırın solunda', () => {
  const s = tegn(rangVeri([['A', -2], ['B', 2]])).svg;
  assert.ok(s.includes('class="g-null"'));
});
test('element öğeleri data-i taşır', () => assert.equal((tegn(rangVeri([['A', 1], ['B', 2]])).svg.match(/data-i=/g) || []).length, 2));
test('rangering: iki null satır sona, sıra kararlı', () => {
  const t = tegn(rangVeri([['A', null], ['B', 2], ['C', null]]));
  assert.deepEqual(t.tabell.rader.map((r) => r[0]), ['B', 'A', 'C']);
});
test('rangering: mal merknad → dikey referans çizgisi ve etiketi', () => {
  const s = tegn({ ...rangVeri([['A', 4], ['B', 2]]), merknader: [{ type: 'mal', y: 3, tekst: 'Hele landet 3,0' }] }).svg;
  assert.match(s, /<line class="g-mal" x1="([\d.]+)" x2="\1"/);
  assert.match(s, /Hele landet 3,0/);
});
