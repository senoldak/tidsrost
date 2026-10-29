import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dagerFraArkiv, dekning, erKomplett, helAar, hittilIAar, oppsummering, periodeTall, sammenlign, toppFylker } from './varselstat.mjs';

const dag = (land, landTotal, hav = [0, 0, 0]) => ({ land, landTotal, hav });
const arkiv = {
  maaneder: {
    '2025-02': { hentet: 'x', dager: { '2025-02-28': dag({ 46: [1, 0, 0] }, [1, 0, 0]), '2025-03-01': dag({ 18: [0, 1, 0] }, [0, 1, 0]) } },
    '2025-03': { hentet: 'x', dager: { '2025-03-01': dag({ 18: [1, 0, 0] }, [1, 0, 0]) } },
  },
  lopende: { fra: '2025-03-20', hentet: '2025-04-10T10:00:00Z', dager: { '2025-04-05': dag({ 46: [0, 0, 1], 15: [0, 0, 1] }, [0, 0, 1], [2, 0, 0]) } },
};

test('dagerFraArkiv: månedsbøtter summeres, egne dager etter arkivets slutt legges til', () => {
  const d = dagerFraArkiv(arkiv);
  assert.deepEqual(d['2025-03-01'].landTotal, [1, 1, 0]);
  assert.deepEqual(d['2025-03-01'].land['18'], [1, 1, 0]);
  assert.deepEqual(d['2025-04-05'].landTotal, [0, 0, 1]);
});

test('dekning og erKomplett: hull mellom arkiv og egne dager oppdages', () => {
  const dk = dekning(arkiv);
  assert.deepEqual(dk, { arkivFra: '2025-02-01', arkivTil: '2025-03-31', egneFra: '2025-03-20', egneTil: '2025-04-10' });
  assert.equal(erKomplett(dk, '2025-02-01', '2025-04-10'), true);
  const hull = { ...dk, egneFra: '2025-04-03' };
  assert.equal(erKomplett(hull, '2025-03-15', '2025-04-05'), false);
  assert.equal(erKomplett(hull, '2025-04-03', '2025-04-05'), true);
  assert.equal(erKomplett(dekning({ maaneder: {} }), '2025-01-01', '2025-01-02'), false);
});

test('periodeTall og hittilIAar: land per fylke, hav separat', () => {
  const d = dagerFraArkiv(arkiv);
  const p = periodeTall(d, '2025-03-01', '2025-04-30');
  assert.deepEqual(p.total, [1, 1, 1]);
  assert.equal(p.fylker['18'], 2);
  assert.deepEqual(p.hav, [2, 0, 0]);
  assert.deepEqual(hittilIAar(d, '2025-01-01').total, [0, 0, 0]); // 1. januar: ingen dager ennå
  assert.deepEqual(hittilIAar(d, '2025-12-31').total, [2, 1, 1]);
});

test('sammenlign: samme dato hvert år, 29. februar blir 28. februar i vanlige år', () => {
  const d = { '2024-02-29': dag({}, [1, 0, 0]), '2025-02-28': dag({}, [2, 0, 0]), '2025-03-01': dag({}, [5, 0, 0]) };
  assert.deepEqual(sammenlign(d, '2024-02-29', 2024, 2025), [
    { aar: 2024, total: 1 },
    { aar: 2025, total: 2 },
  ]);
});

test('helAar og toppFylker', () => {
  const d = dagerFraArkiv(arkiv);
  assert.equal(helAar(d, 2025), 4);
  assert.deepEqual(toppFylker({ '46': 3, '18': 5, '03': 0 }, 2), [
    { kode: '18', navn: 'Nordland', antall: 5 },
    { kode: '46', navn: 'Vestland', antall: 3 },
  ]);
  assert.deepEqual(toppFylker({}, 2), []);
});

test('oppsummering: tall, nivåer, flest varsler og tom periode', () => {
  const s = oppsummering({ total: [5, 2, 1], fylker: { '46': 4, '18': 3 } }, 'de siste 30 dagene');
  assert.equal(s[0], 'Meteorologisk institutt har sendt ut 8 farevarsler på land de siste 30 dagene.');
  assert.equal(s[1], 'To av dem var oransje og ett var rødt.');
  assert.equal(s[2], 'Flest gikk til Vestland og Nordland.');
  assert.deepEqual(oppsummering({ total: [0, 0, 0], fylker: {} }, 'hittil i år'), ['Det er ikke sendt ut farevarsler på land hittil i år.']);
  assert.equal(oppsummering({ total: [1, 0, 0], fylker: { '03': 1 } }, 'de siste 30 dagene')[0], 'Meteorologisk institutt har sendt ut 1 farevarsel på land de siste 30 dagene.');
});

test('periodeTall: nivåfordeling per fylke', () => {
  const p = periodeTall(dagerFraArkiv(arkiv), '2025-03-01', '2025-04-30');
  assert.deepEqual(p.fylkerNiva['18'], [1, 1, 0]);
  assert.deepEqual(p.fylkerNiva['46'], [0, 0, 1]);
});
