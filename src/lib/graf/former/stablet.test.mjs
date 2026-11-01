import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn as stablet } from './stablet.mjs';
import { tegn as gruppert } from './gruppert.mjs';
import { tegn as stabletflate } from './stabletflate.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (form, serier, valg) => ({ form, tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: serier.map(([navn, ys]) => ({ navn, punkter: ys.map((y, i) => ({ x: `x${i}`, y })) })), valg });
const toppY = (svg, i) => Math.min(...[...svg.matchAll(new RegExp(`<g data-i="${i}">(.*?)</g>`, 'g'))][0][1].match(/ y="([\d.]+)"/g).map((m) => +m.slice(4, -1)));

test('çok serili biçimler en az 2 seri ister', () => {
  for (const form of ['stablet', 'gruppert', 'stabletflate']) assert.match(validerGraf(veri(form, [['a', [1]]])).join(), /2 seri/);
});
test('stablet: negatif değer hata', () => assert.match(validerGraf(veri('stablet', [['a', [1]], ['b', [-1]]])).join(), /negatif/));
test('stablet: büyük toplam daha yüksek sütun', () => { const s = stablet(veri('stablet', [['a', [1, 3]], ['b', [1, 3]]])).svg; assert.ok(toppY(s, 1) < toppY(s, 0)); });
test('stablet: prosent → her sütunun üstü aynı', () => { const s = stablet(veri('stablet', [['a', [1, 3]], ['b', [1, 1]]], { prosent: true })).svg; assert.equal(toppY(s, 0), toppY(s, 1)); });
test('stablet: ipucu katmanlar ve toplam', () => assert.equal(stablet(veri('stablet', [['a', [1]], ['b', [2]]])).punkter[0].tekst, 'x0\na: 1,0 %\nb: 2,0 %\nSum: 3,0 %'));
test('stablet: nokkel', () => assert.equal(stablet(veri('stablet', [['a', [1]], ['b', [2]]])).nokkel.length, 2));
test('gruppert: grup başına seri sayısı kadar sütun', () => {
  const s = gruppert(veri('gruppert', [['a', [1, 2]], ['b', [3, null]], ['c', [1, 1]]])).svg;
  assert.equal(([...s.matchAll(/<g data-i="0">(.*?)<\/g>/g)][0][1].match(/class="g-f-/g) || []).length, 3);
  assert.equal(([...s.matchAll(/<g data-i="1">(.*?)<\/g>/g)][0][1].match(/class="g-f-/g) || []).length, 2);
});
test('gruppert: negatif sütun sıfırın altında', () => assert.ok(!gruppert(veri('gruppert', [['a', [-2]], ['b', [1]]])).svg.includes('NaN')));
test('stabletflate: katman sayısı kadar alan, serie modu', () => {
  const t = stabletflate(veri('stabletflate', [['a', [1, 2, 3]], ['b', [1, 1, 1]]]));
  assert.equal((t.svg.match(/class="g-lag /g) || []).length, 2);
  assert.equal(t.modus, 'serie');
  assert.match(t.punkter[2].tekst, /Sum: 4,0 %/);
});
test('tek x NaN yok', () => { for (const f of [stablet, gruppert, stabletflate]) assert.ok(!f(veri('stablet', [['a', [1]], ['b', [2]]])).svg.includes('NaN')); });
