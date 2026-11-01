import test from 'node:test';
import assert from 'node:assert/strict';
import { fraStolper, fraLinjer } from './fra.mjs';

test('fraStolper: rader → tek seri + fremhev', () => {
  assert.deepEqual(fraStolper('Endring', [{ navn: 'A', verdi: 1 }, { navn: 'B', verdi: null, fremhev: true }], { sorter: false }), {
    serier: [{ navn: 'Endring', punkter: [{ x: 'A', y: 1 }, { x: 'B', y: null }] }],
    valg: { fremhev: ['B'], sorter: false },
  });
});
test('fraLinjer: etikett/verdi → x/y', () => assert.deepEqual(fraLinjer([{ navn: 'KPI', punkter: [{ etikett: 'jan', verdi: 2 }] }]), [{ navn: 'KPI', punkter: [{ x: 'jan', y: 2 }] }]));
