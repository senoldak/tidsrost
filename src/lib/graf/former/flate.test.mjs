import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './flate.mjs';

const veri = (ys) => ({ form: 'flate', tittel: 'Boligpriser', kilde: { navn: 'SSB' }, enhet: 'Indeks', serier: [{ navn: 'Indeks', punkter: ys.map((y, i) => ({ x: `k${i}`, y })) }] });

test('flate: gradyan kimliği grafik başına', () => {
  const a = tegn(veri([1, 2, 3]), { id: 'g1' }).svg, b = tegn(veri([1, 2, 3]), { id: 'g2' }).svg;
  assert.match(a, /id="g1-f"/); assert.match(b, /id="g2-f"/); assert.match(a, /fill="url\(#g1-f\)"/);
});
test('flate: null alanı ikiye böler', () => assert.equal((tegn(veri([1, 2, null, 3, 4]), { id: 'g' }).svg.match(/class="g-alan"/g) || []).length, 2));
test('flate: serie modu ve çizgi', () => { const t = tegn(veri([1, 2]), { id: 'g' }); assert.equal(t.modus, 'serie'); assert.match(t.svg, /g-s0/); });
test('flate: iki seride iki alan ve iki gradyan', () => {
  const s = tegn({ ...veri([1, 2, 3]), serier: [veri([1, 2, 3]).serier[0], { navn: 'B', punkter: [{ x: 'k0', y: 0.5 }, { x: 'k1', y: 1 }, { x: 'k2', y: 1.5 }] }] }, { id: 'g' }).svg;
  assert.equal((s.match(/class="g-alan/g) || []).length, 2);
  assert.match(s, /id="g-f2"/);
});
