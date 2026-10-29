import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lagSlug } from './slug.mjs';

test('lagSlug: norske bokstaver og tegn', () => {
  assert.equal(lagSlug('Ørjan'), 'orjan');
  assert.equal(lagSlug('Anne-Marie'), 'anne-marie');
  assert.equal(lagSlug('Våler (Østfold)'), 'valer-ostfold');
  assert.equal(lagSlug('Bærum'), 'baerum');
  assert.equal(lagSlug('  Åse  '), 'ase');
  assert.equal(lagSlug('Guovdageaidnu - Kautokeino'), 'guovdageaidnu-kautokeino');
  assert.equal(lagSlug('José Ñandú'), 'jose-nandu');
});
