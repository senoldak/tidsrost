import test from 'node:test';
import assert from 'node:assert/strict';
import { tegn } from './linje.mjs';

const veri3 = { form: 'linje', tittel: 'Prisvekst', kilde: { navn: 'SSB' }, enhet: 'Prosent', desimaler: 1, serier: [{ navn: 'KPI', punkter: [{ x: 'jan', y: 2.1 }, { x: 'feb', y: 3 }, { x: 'mar', y: 3.4 }] }] };
const logVeri = { ...veri3, valg: { logAkse: true }, serier: [{ navn: 'KPI', punkter: [{ x: '1865', y: 1 }, { x: '1950', y: 8 }, { x: '2025', y: 100 }] }] };

test('linje: punkter sayısı = x sayısı, modus serie', () => { const t = tegn(veri3); assert.equal(t.modus, 'serie'); assert.equal(t.punkter.length, 3); });
test('linje: ipucu metni etiket + değer + kısa birim', () => assert.equal(tegn(veri3).punkter[2].tekst, 'mar\n3,4 %'));
test('linje: null nokta ipucunda atlanır, tabloda "–"', () => {
  const t = tegn({ ...veri3, serier: [{ navn: 'a', punkter: [{ x: 'jan', y: 1 }, { x: 'feb', y: null }, { x: 'mar', y: 2 }] }] });
  assert.equal(t.punkter.length, 2);
  assert.equal(t.tabell.rader[1][1], '–');
});
test('linje: tek nokta NaN içermez', () => assert.ok(!tegn({ ...veri3, serier: [{ navn: 'a', punkter: [{ x: 'jan', y: 4 }] }] }).svg.includes('NaN')));
test('linje: trapp yolu H/V kullanır', () => assert.match(tegn({ ...veri3, valg: { trapp: true } }).svg, /H[\d.]+V/));
test('linje: mal çizgisi ve metni', () => assert.match(tegn({ ...veri3, merknader: [{ type: 'mal', y: 2, tekst: 'Mål 2 %' }] }).svg, /Mål 2 %/));
test('linje: periode dolgusu', () => assert.match(tegn({ ...veri3, merknader: [{ type: 'periode', fra: 'feb', til: 'feb', tekst: 'Toppen' }] }).svg, /class="g-periode"/));
test('linje: logAkse 1,10,100 eksen değerleri', () => { const s = tegn(logVeri).svg; for (const v of ['>1<', '>10<', '>100<']) assert.ok(s.includes(v), v); });
test('linje: çoklu seri, ipucunda her seri bir satır', () => {
  const t = tegn({ ...veri3, serier: [veri3.serier[0], { navn: 'KPI-JAE', punkter: [{ x: 'jan', y: 1 }, { x: 'feb', y: 2 }, { x: 'mar', y: 2.5 }] }] });
  assert.equal(t.punkter[0].tekst, 'jan\nKPI: 2,1 %\nKPI-JAE: 1,0 %');
  assert.match(t.svg, /g-s1/);
});
test('linje: style="" ve kaçışsız < yok', () => {
  const s = tegn({ ...veri3, serier: [{ navn: 'a<b', punkter: [{ x: '<x>', y: 1 }, { x: 'y', y: 2 }] }] }).svg;
  assert.ok(!/style=/.test(s));
  assert.ok(!s.includes('<x>'));
});
test('linje: ramme topp/bunn verir', () => { const t = tegn(veri3); assert.ok(t.ramme.bunn > t.ramme.topp); });
test('linje: ikinci seri x etiketine göre hizalanır', () => {
  const t = tegn({ ...veri3, serier: [veri3.serier[0], { navn: 'B', punkter: [{ x: 'feb', y: 5 }, { x: 'mar', y: 6 }] }] });
  assert.equal(t.punkter[0].tekst, 'jan\nKPI: 2,1 %\nB: –');
  assert.equal(t.tabell.rader[1][2], '5,0');
});
test('linje: çoklu seride nokkel, tek seride yok', () => {
  assert.equal(tegn(veri3).nokkel, undefined);
  assert.deepEqual(tegn({ ...veri3, serier: [veri3.serier[0], { navn: 'B', punkter: [{ x: 'jan', y: 1 }] }] }).nokkel, [{ navn: 'KPI', klasse: 'g-s0' }, { navn: 'B', klasse: 'g-s1' }]);
});
