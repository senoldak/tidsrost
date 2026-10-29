import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endringProsent, omregn } from './prisomregner.mjs';

const data = { aar: { 1990: 50, 2025: 100, 2024: 98 }, mnd: { '2025-09': 100, '2026-09': 103 } };

test('omregn: år mot år', () => {
  assert.equal(omregn(data, 100, '1990', '2025'), 200);
  assert.equal(omregn(data, 100, '2025', '1990'), 50);
});
test('omregn: samme periode gir samme beløp', () => {
  assert.equal(omregn(data, 123, '2024', '2024'), 123);
});
test('omregn: ukjent periode, ugyldig beløp → null', () => {
  assert.equal(omregn(data, 100, '1864', '2025'), null);
  assert.equal(omregn(data, 100, '1990', '2099'), null);
  assert.equal(omregn(data, -5, '1990', '2025'), null);
  assert.equal(omregn(data, 0, '1990', '2025'), null);
  assert.equal(omregn(data, NaN, '1990', '2025'), null);
  assert.equal(omregn(data, 100, '', '2025'), null);
  assert.equal(omregn(data, 100, '1990', '2025-13'), null);
  assert.equal(omregn(null, 100, '1990', '2025'), null);
});
test('omregn: måned mot måned', () => {
  assert.equal(omregn(data, 100, '2025-09', '2026-09'), 103);
});
test('omregn: år og måned blandet bruker årsindeksen', () => {
  assert.equal(omregn(data, 100, '1990', '2025-09'), 200);
  assert.equal(omregn(data, 100, '2025-09', '1990'), 50);
});
test('endringProsent', () => {
  assert.equal(endringProsent(data, '1990', '2025'), 100);
  assert.ok(Math.abs(endringProsent(data, '2025-09', '2026-09') - 3) < 1e-9);
  assert.equal(endringProsent(data, '1864', '2025'), null);
});
