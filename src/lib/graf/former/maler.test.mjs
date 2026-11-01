import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './maler.mjs';
import { validerGraf } from '../sema.mjs';

const veri = (y, maks = 6) => ({ form: 'maler', tittel: 'Prisvekst', kilde: { navn: 'SSB' }, enhet: 'Prosent', serier: [{ navn: 'KPI', punkter: [{ x: 'sep. 2026', y }] }], merknader: [{ type: 'mal', y: 2, tekst: 'Mål 2 %' }], valg: { maks } });

test('maler: valg.maks zorunlu', () => assert.match(validerGraf({ ...veri(3), valg: {} }).join(), /maks/));
test('maler: değer ve hedef', () => { const s = tegn(veri(3.4)).svg; assert.match(s, /3,4 %/); assert.match(s, /Mål 2 %/); });
test('maler: maks aşılınca yay maks\'ta durur, metin gerçek değer', () => {
  const a = tegn(veri(9)).svg, b = tegn(veri(6)).svg;
  assert.match(a, /9,0 %/);
  assert.equal(a.match(/class="g-f-su"[^>]*d="([^"]+)"/)?.[1] ?? a.match(/d="([^"]+)"[^>]*class="g-f-su"/)[1], b.match(/class="g-f-su"[^>]*d="([^"]+)"/)?.[1] ?? b.match(/d="([^"]+)"[^>]*class="g-f-su"/)[1]);
});
test('maler: negatif değer NaN üretmez', () => assert.ok(!tegn(veri(-1)).svg.includes('NaN')));
