import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './prikksoyle.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (ys, valg) => ({ form: 'prikksoyle', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'KPI', punkter: ys.map((y, i) => ({ x: String(2001 + i), y })) }], valg });
const prikker = (svg, i) => (svg.match(new RegExp(`<g data-i="${i}">(.*?)</g>`))[1].match(/<circle/g) || []).length;

test('prikksoyle: prikk sayısı = round(y / prikk)', () => { const s = tegn(veri([3, 1.2])).svg; assert.equal(prikker(s, 0), 6); assert.equal(prikker(s, 1), 2); });
test('prikksoyle: valg.prikk', () => assert.equal(prikker(tegn(veri([3], { prikk: 1 })).svg, 0), 3));
test('prikksoyle: negatif → 0 nokta, değer ipucunda', () => { const t = tegn(veri([-0.5, 2])); assert.equal(prikker(t.svg, 0), 0); assert.match(t.punkter[0].tekst, /−0,5/); });
test('prikksoyle: valg.prikk pozitif olmalı', () => assert.match(validerGraf(veri([1], { prikk: 0 })).join(), /prikk/));
test('prikksoyle: bakgrunn soluk noktalar = sütun × maks − dolu', () => {
  const s = tegn(veri([1, 0.5], { bakgrunn: true })).svg;
  assert.equal((s.match(/class="g-prikk-bak"/g) || []).length, 2 * 2 - 3);
});
