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
