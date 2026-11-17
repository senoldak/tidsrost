import test from 'node:test';
import assert from 'node:assert/strict';
import { birlestir, rens } from './yazar-aktivite.mjs';

test('rens: yalnız o sitenin geçerli tarihleri, sıralı ve tekrarsız', () => {
  const data = [
    { site: 'finfolis', date: '2026-11-02T08:00:00.000Z' },
    { site: 'finfolis', date: '2026-11-01T08:00:00+03:00' },
    { site: 'finfolis', date: '2026-11-02T08:00:00.000Z' },
    { site: 'kifobu', date: '2026-11-03T08:00:00.000Z' },
    { site: 'finfolis', date: 'dün' },
    null,
  ];
  assert.deepEqual(rens('finfolis', data), ['2026-11-01T05:00:00.000Z', '2026-11-02T08:00:00.000Z']);
  assert.equal(rens('finfolis', { feil: true }), null);
});

test('birlestir: başarısız site önceki listesini korur', () => {
  const onceki = { oppdatert: 'x', sider: { finfolis: ['a'], kifobu: ['b'] } };
  const ut = birlestir(onceki, { finfolis: ['c'], kifobu: null, jendume: ['d'] }, new Date('2026-11-17T12:00:00Z'));
  assert.deepEqual(ut, { oppdatert: '2026-11-17T12:00:00.000Z', sider: { finfolis: ['c'], kifobu: ['b'], jendume: ['d'] } });
});
