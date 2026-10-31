import test from 'node:test';
import assert from 'node:assert/strict';
import { konturSvg } from './kontur.mjs';

test('konturSvg: 7 ringer, den tredje i vannblått', () => {
  const s = konturSvg();
  assert.ok(s.startsWith('<svg '));
  assert.match(s, /aria-hidden="true"/);
  assert.equal((s.match(/<polyline/g) ?? []).length, 7);
  assert.equal((s.match(/#1f5f99/g) ?? []).length, 1);
  assert.equal((s.match(/#a8643a/g) ?? []).length, 6);
});

test('konturSvg: deterministisk per seed, ulik mellom seeds', () => {
  assert.equal(konturSvg(3), konturSvg(3));
  assert.equal(konturSvg(), konturSvg(0));
  assert.notEqual(konturSvg(1), konturSvg(2));
});
