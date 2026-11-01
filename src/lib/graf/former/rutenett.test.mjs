import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './rutenett.mjs';

const veri = (y) => ({ form: 'rutenett', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Arbeidsledige', punkter: [{ x: 'sep. 2026', y }] }] });
const dolu = (svg) => (svg.match(/class="g-f-rod"/g) || []).length;

test('rutenett: 5,0 → 5 dolu kare, 100 kare', () => { const s = tegn(veri(5)).svg; assert.equal(dolu(s), 5); assert.equal((s.match(/<rect/g) || []).length, 100); });
test('rutenett: 4,6 → 5 dolu', () => assert.equal(dolu(tegn(veri(4.6)).svg), 5));
test('rutenett: 0 ve 120 sınırlanır', () => { assert.equal(dolu(tegn(veri(0)).svg), 0); assert.equal(dolu(tegn(veri(120)).svg), 100); });
test('rutenett: dolu karede seri adı', () => assert.match(tegn(veri(5)).punkter[0].tekst, /Arbeidsledige/));
test('rutenett: çok kategori, sınıf başına kare, toplam 100', () => {
  const t = tegn({ form: 'rutenett', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'Andel', punkter: [{ x: 'A', y: 55.4 }, { x: 'B', y: 30.2 }, { x: 'C', y: 14.4 }] }] });
  assert.equal((t.svg.match(/<rect data-i/g) || []).length, 100);
  assert.equal((t.svg.match(/class="g-f-su"/g) || []).length, 55);
  assert.equal((t.svg.match(/class="g-f-kontur"/g) || []).length, 30);
  assert.match(t.punkter[0].tekst, /^A\n55,4 %/);
  assert.equal(t.nokkel.length, 3);
});
