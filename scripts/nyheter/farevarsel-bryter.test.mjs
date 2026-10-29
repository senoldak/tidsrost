import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dagssideAktiv } from './farevarsel-bryter.mjs';

test('dagssideAktiv: av som standard, på bare med FAREVARSEL_DAGSSIDE=1', () => {
  assert.equal(dagssideAktiv({}), false);
  assert.equal(dagssideAktiv({ FAREVARSEL_DAGSSIDE: '1' }), true);
  assert.equal(dagssideAktiv({ FAREVARSEL_DAGSSIDE: '0' }), false);
  assert.equal(dagssideAktiv({ FAREVARSEL_DAGSSIDE: '' }), false);
});
