import test from 'node:test';
import assert from 'node:assert/strict';
import { validerGraf } from './sema.mjs';

const gecerli = { form: 'linje', tittel: 't', kilde: { navn: 'SSB' }, enhet: 'prosent', serier: [{ navn: 'a', punkter: [{ x: '2026-01', y: 1 }] }] };

test('validerGraf: geçerli veri hatasız', () => assert.deepEqual(validerGraf(gecerli), []));
test('validerGraf: kilde zorunlu', () => assert.match(validerGraf({ ...gecerli, kilde: { navn: '' } }).join(), /kilde/));
test('validerGraf: bilinmeyen form', () => assert.match(validerGraf({ ...gecerli, form: 'yok' }).join(), /form/));
test('validerGraf: boş serier', () => assert.match(validerGraf({ ...gecerli, serier: [] }).join(), /serier/));
test('validerGraf: NaN y hata, null serbest', () => {
  assert.ok(validerGraf({ ...gecerli, serier: [{ navn: 'a', punkter: [{ x: 1, y: NaN }] }] }).length > 0);
  assert.deepEqual(validerGraf({ ...gecerli, serier: [{ navn: 'a', punkter: [{ x: 1, y: null }, { x: 2, y: 3 }] }] }), []);
});
test('validerGraf: hepsi null seri hata', () => assert.match(validerGraf({ ...gecerli, serier: [{ navn: 'a', punkter: [{ x: 1, y: null }] }] }).join(), /verdi/));
test('validerGraf: maler/rutenett null değer hata (uydurma 0 olmasın)', () => {
  assert.ok(validerGraf({ ...gecerli, form: 'rutenett', serier: [{ navn: 'a', punkter: [{ x: 1, y: null }] }] }).length > 0);
  assert.ok(validerGraf({ ...gecerli, form: 'maler', valg: { maks: 6 }, serier: [{ navn: 'a', punkter: [{ x: 1, y: null }] }] }).length > 0);
});
