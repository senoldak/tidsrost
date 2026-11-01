import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn as flyt } from './flyt.mjs';
import { tegn as tre } from './tre.mjs';
import { validerGraf } from '../sema.mjs';

const fv = (rader) => ({ form: 'flyt', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Milliarder kroner', desimaler: 0, serier: [{ navn: 'Flyt', punkter: rader.map(([x, til, y]) => ({ x, til, y })) }] });
const tv = (rader) => ({ form: 'tre', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Vekt', serier: [{ navn: 'Vekt', punkter: rader.map(([x, y]) => ({ x, y })) }] });
const rects = (svg) => [...svg.matchAll(/<rect data-i="\d+" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));

test('flyt: til zorunlu', () => assert.match(validerGraf(fv([['a', undefined, 1]])).join(), /til/));
test('flyt: bant sayısı = nokta sayısı', () => assert.equal((flyt(fv([['Skatt', 'Stat', 50], ['Avgift', 'Stat', 20], ['Skatt', 'Kommune', 30]])).svg.match(/class="g-flyt/g) || []).length, 3));
test('flyt: sol ve sağ düğüm toplamları eşit', () => {
  const s = flyt(fv([['A', 'X', 50], ['B', 'X', 20], ['A', 'Y', 30]])).svg;
  const sum = (kl) => [...s.matchAll(new RegExp(`class="${kl}"[^>]*height="([\\d.]+)"`, 'g'))].reduce((a, m) => a + +m[1], 0);
  assert.ok(Math.abs(sum('g-node-v') - sum('g-node-h')) < 0.5);
});
test('flyt: uzun düğüm adı kısalır, ipucunda tam', () => {
  const t = flyt(fv([['Skatt på inntekt og formue fra personer', 'Statsbudsjettet', 10]]));
  assert.match(t.svg, /…/);
  assert.match(t.punkter[0].tekst, /Skatt på inntekt og formue fra personer → Statsbudsjettet/);
});
test('tre: alanlar toplamı çizim alanı', () => {
  const r = rects(tre(tv([['a', 5], ['b', 3], ['c', 2]])).svg);
  assert.ok(Math.abs(r.reduce((a, q) => a + q.w * q.h, 0) - 400 * 240) < 400 * 240 * 0.01);
});
test('tre: en büyük değer en büyük kutu', () => {
  const r = rects(tre(tv([['a', 1], ['b', 6], ['c', 3]])).svg);
  const alan = r.map((q) => q.w * q.h);
  assert.equal(alan.indexOf(Math.max(...alan)), 0); // sıralı: b önce
});
test('tre: sıfır toplam NaN yok', () => assert.ok(!tre(tv([['a', 0], ['b', 0]])).svg.includes('NaN')));
test('tre: ipucu gerçek değer ve pay', () => assert.equal(tre(tv([['a', 3], ['b', 1]])).punkter[0].tekst, 'a\n3,0 (75,0 %)'));
