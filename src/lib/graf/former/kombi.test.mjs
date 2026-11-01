import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn as kombi } from './kombi.mjs';
import { tegn as spredning } from './spredning.mjs';
import { tegn as radial } from './radial.mjs';
import { tegn as smaa } from './smaa.mjs';
import { validerGraf } from '../sema.mjs';

const kv = (a, b) => ({ form: 'kombi', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Milliarder kroner', desimaler: 0, valg: { enhet2: 'Prosent' }, serier: [{ navn: 'Eksport', punkter: a.map((y, i) => ({ x: `k${i}`, y })) }, { navn: 'Vekst', punkter: b.map((y, i) => ({ x: `k${i}`, y })) }] });
const sp = (pts, valg) => ({ form: 'spredning', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Kommuner', punkter: pts.map(([x, y]) => ({ x, y })) }], valg });
const rv = (ys) => ({ form: 'radial', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'M', punkter: ys.map((y, i) => ({ x: `m${i}`, y })) }] });
const sm = (n) => ({ form: 'smaa', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: Array.from({ length: n }, (_, k) => ({ navn: `S${k}`, punkter: [1, 2, 3].map((y, i) => ({ x: `x${i}`, y: y + k })) })) });

test('kombi: tam 2 seri', () => assert.match(validerGraf({ ...kv([1], [1]), serier: [kv([1], [1]).serier[0]] }).join(), /kombi/));
test('kombi: iki eksen grubu, ipucu iki satır', () => {
  const t = kombi(kv([100, 120], [2, 3]));
  assert.equal((t.svg.match(/class="g-akse/g) || []).length >= 2, true);
  assert.match(t.svg, /class="g-akse g-akse-h"/);
  assert.equal(t.punkter[1].tekst, 'k1\nEksport: 120 mrd. kr\nVekst: 3 %');
});
test('spredning: x sayısal olmalı', () => assert.match(validerGraf(sp([['a', 1]])).join(), /sayısal/));
test('spredning: trend doğrusu y=2x+1', () => {
  const s = spredning(sp([[0, 1], [5, 11], [10, 21]], { trend: true })).svg;
  const m = s.match(/class="g-trend"[^>]*data-a="([\d.-]+)" data-b="([\d.-]+)"/);
  assert.equal(+m[1], 2);
  assert.equal(+m[2], 1);
});
test('spredning: koble noktaları sırayla bağlar', () => assert.match(spredning(sp([[0, 1], [1, 2]], { koble: true })).svg, /class="g-koble"/));
test('radial: n dilim', () => assert.equal((radial(rv([1, 2, 3, 4])).svg.match(/<path data-i=/g) || []).length, 4));
test('radial: negatif NaN yok', () => assert.ok(!radial(rv([-1, 2])).svg.includes('NaN')));
test('smaa: panel sayısı = seri sayısı, ortak ölçek', () => {
  const t = smaa(sm(4));
  assert.equal(t.punkter.length, 4);
  assert.equal((t.svg.match(/<g data-i=/g) || []).length, 4);
  assert.match(t.punkter[0].tekst, /S0\nSiste: 3,0 %/);
});
test('smaa: tek x NaN yok', () => assert.ok(!smaa({ ...sm(2), serier: sm(2).serier.map((s) => ({ ...s, punkter: s.punkter.slice(0, 1) })) }).svg.includes('NaN')));
