import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn as fremdrift } from './fremdrift.mjs';
import { tegn as fossefall } from './fossefall.mjs';
import { validerGraf } from '../sema.mjs';

const fv = (rader) => ({ form: 'fremdrift', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Mål', punkter: rader.map(([x, y, y2]) => ({ x, y, y2 })) }] });
const ff = (rader, valg) => ({ form: 'fossefall', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Milliarder kroner', desimaler: 0, serier: [{ navn: 'Budsjett', punkter: rader.map(([x, y]) => ({ x, y })) }], valg });
const bredde = (svg, i, kl) => +[...svg.matchAll(new RegExp(`<g data-i="${i}">(.*?)</g>`, 'g'))][0][1].match(new RegExp(`width="([\\d.]+)" height="[\\d.]+" class="${kl}"`))[1];

test('fremdrift: hedef (y2) zorunlu ve 0 olamaz', () => {
  assert.match(validerGraf(fv([['a', 1, undefined]])).join(), /y2/);
  assert.match(validerGraf(fv([['a', 1, 0]])).join(), /y2/);
});
test('fremdrift: %100 aşılınca çubuk izde durur, metin gerçek yüzde', () => {
  const t = fremdrift(fv([['a', 150, 100], ['b', 100, 100]]));
  assert.equal(bredde(t.svg, 0, 'g-f-su'), bredde(t.svg, 1, 'g-f-su'));
  assert.match(t.punkter[0].tekst, /150 % av målet/);
});
test('fremdrift: hedef altı soluk', () => assert.match(fremdrift(fv([['a', 40, 100]])).svg, /class="g-f-su2"/));
test('fossefall: kümülatif üst sınırlar', () => {
  const t = fossefall(ff([['Start', 100], ['Inn', 30], ['Ut', -50]], { sum: true }));
  assert.equal(t.punkter.length, 4);
  assert.match(t.punkter[3].tekst, /Sum\n80 kr|Sum\n80/);
  assert.match(t.punkter[1].tekst, /\+30/);
  assert.match(t.punkter[2].tekst, /−50/);
});
test('fossefall: artış su, azalış kırmızı, toplam gri', () => {
  const s = fossefall(ff([['Start', 100], ['Inn', 30], ['Ut', -50]], { sum: true })).svg;
  for (const k of ['g-f-su', 'g-f-rod', 'g-f-bar']) assert.match(s, new RegExp(`class="${k}"`));
});
test('fossefall: negatif başlangıç NaN yok', () => assert.ok(!fossefall(ff([['Start', -10], ['Inn', 5]])).svg.includes('NaN')));
