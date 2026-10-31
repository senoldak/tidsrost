import test from 'node:test';
import assert from 'node:assert/strict';
import { portrett } from './portrett.mjs';
import { AGENTER } from './redaksjon.mjs';

test('portrett: SVG med riktige attributter', () => {
  const s = portrett(AGENTER.sigrid.u, true);
  assert.ok(s.startsWith('<svg '));
  assert.ok(s.endsWith('</svg>'));
  assert.match(s, /aria-hidden="true"/);
  assert.match(s, /shape-rendering="crispEdges"/);
  assert.match(s, /viewBox="0 0 48 51"/);
});

test('portrett: KI-kortets rød bare når ki=true', () => {
  const u = AGENTER.leif.u; // ingen rød i drakten
  assert.ok(portrett(u, true).includes('#c8281e'));
  assert.ok(!portrett(u, false).includes('#c8281e'));
  assert.ok(!portrett(AGENTER.senol.u, false).includes('#c8281e'));
});

test('portrett: alle agenter kan tegnes, pikselstørrelse styrer viewBox', () => {
  for (const a of Object.values(AGENTER)) assert.ok(portrett(a.u, a.ki).startsWith('<svg '));
  assert.match(portrett(AGENTER.kari.u, true, 2), /viewBox="0 0 32 34"/);
});

test('portrett: deterministisk', () => {
  assert.equal(portrett(AGENTER.ingrid.u, true), portrett(AGENTER.ingrid.u, true));
});
