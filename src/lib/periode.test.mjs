import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forskyvMaaned, finnMaaned } from './periode.mjs';

test('forskyvMaaned: over årsskiftet', () => {
  assert.equal(forskyvMaaned('2026-09', -1), '2026-08');
  assert.equal(forskyvMaaned('2026-01', -1), '2025-12');
  assert.equal(forskyvMaaned('2026-09', -12), '2025-09');
});

test('finnMaaned: slår opp på måned, ikke posisjon — manglende måned gir undefined', () => {
  const serie = [{ maaned: '2026-07', v: 1 }, { maaned: '2026-09', v: 3 }];
  assert.equal(finnMaaned(serie, '2026-08'), undefined);
  assert.equal(finnMaaned(serie, '2026-07').v, 1);
});
