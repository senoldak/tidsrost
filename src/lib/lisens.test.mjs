import test from 'node:test';
import assert from 'node:assert/strict';
import { LISENS_URL, LISENS_JSONLD_URL } from './lisens.mjs';

test('lisens adresleri CC BY-NC 4.0', () => {
  assert.equal(LISENS_URL, 'https://creativecommons.org/licenses/by-nc/4.0/deed.no');
  assert.equal(LISENS_JSONLD_URL, 'https://creativecommons.org/licenses/by-nc/4.0/');
});
