import test from 'node:test';
import assert from 'node:assert/strict';
import { validerSvar, osloDag } from './valider.mjs';

const J = 'application/json';
test('gyldig svar', () => {
  assert.deepEqual(validerSvar('{"slug":"en-sak-1","svar":"ja"}', J), { ok: true, slug: 'en-sak-1', svar: 'ja' });
  assert.equal(validerSvar('{"slug":"a","svar":"nei"}', 'application/json; charset=utf-8').ok, true);
});
test('ugyldig innhold avvises', () => {
  for (const t of ['', 'x', '[]', 'null', '{"slug":"A","svar":"ja"}', '{"slug":"a b","svar":"ja"}', '{"slug":"","svar":"ja"}', '{"slug":"a","svar":"kanskje"}', '{"slug":1,"svar":"ja"}', `{"slug":"${'a'.repeat(161)}","svar":"ja"}`]) {
    assert.equal(validerSvar(t, J).ok, false, t);
  }
});
test('feil Content-Type og for stor kropp avvises', () => {
  assert.equal(validerSvar('{"slug":"a","svar":"ja"}', 'text/plain').ok, false);
  assert.equal(validerSvar('{"slug":"a","svar":"ja"}', undefined).ok, false);
  assert.equal(validerSvar(`{"slug":"a","svar":"ja","x":"${'y'.repeat(1100)}"}`, J).ok, false);
});
test('osloDag bruker Oslo-tid', () => {
  assert.equal(osloDag(new Date('2026-10-31T23:30:00Z')), '2026-11-01');
  assert.equal(osloDag(new Date('2026-07-01T12:00:00Z')), '2026-07-01');
});
