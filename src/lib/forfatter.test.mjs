import test from 'node:test';
import assert from 'node:assert/strict';
import { synligForfatter } from './forfatter.mjs';

const SITE = 'tidsrøst';

test('forklart ve analyse: kişi imzası', () => {
  assert.equal(synligForfatter({ sjanger: 'forklart', author: SITE }, SITE), 'Şenol Dak');
  assert.equal(synligForfatter({ sjanger: 'analyse' }, SITE), 'Şenol Dak');
  assert.equal(synligForfatter({ sjanger: 'forklart', author: 'Şenol Dak' }, SITE), 'Şenol Dak');
});

test('bot haberi: ön bilgide kişi adı olsa da site adı', () => {
  assert.equal(synligForfatter({ author: 'Şenol Dak' }, SITE), SITE);
  assert.equal(synligForfatter({ sjanger: 'nyhet', author: 'Şenol Dak' }, SITE), SITE);
  assert.equal(synligForfatter({}, SITE), SITE);
});
