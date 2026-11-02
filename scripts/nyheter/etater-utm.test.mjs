import test from 'node:test';
import assert from 'node:assert/strict';
import { utenUtm } from './kilder/etater.mjs';

test('utenUtm: izleme parametreleri atılır, diğerleri kalır', () => {
  assert.equal(utenUtm('https://forbund.example/nyheter/a/?utm_source=rss&utm_medium=feed&utm_campaign=nyheter'), 'https://forbund.example/nyheter/a/');
  assert.equal(utenUtm('https://forbund.example/a/?side=2&utm_source=rss'), 'https://forbund.example/a/?side=2');
  assert.equal(utenUtm('https://forbund.example/a/'), 'https://forbund.example/a/');
});
