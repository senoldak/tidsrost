import test from 'node:test';
import assert from 'node:assert/strict';
import { aarsRutenett } from './aktivitet.mjs';

const NA = new Date('2026-11-17T15:00:00+01:00'); // tirsdag

const finn = (rader, key) => {
  for (const r of rader) for (const u of r.uker) for (const c of u) if (c?.key === key) return c;
  return undefined;
};

test('yıl satırları: en yeni üstte, egen dönem dolu ve işaretli, kayıtlı günler gerçek siteler', () => {
  const poster = [
    { date: new Date('2026-11-16T08:00:00+01:00'), site: 'tidsrost' },
    { date: new Date('2026-11-16T09:00:00+01:00'), site: 'finfolis' },
  ];
  const rader = aarsRutenett(poster, { fra: '2025-12-30', til: '2026-11-13', sider: ['jendume', 'kifobu'] }, NA);
  assert.deepEqual(
    rader.map((r) => r.aar),
    [2026, 2025],
  );
  assert.deepEqual(finn(rader, '2025-12-31'), { key: '2025-12-31', siter: ['jendume', 'kifobu'], egen: true });
  assert.deepEqual(finn(rader, '2026-11-16').siter.sort(), ['finfolis', 'tidsrost']);
  assert.equal(finn(rader, '2026-11-16').egen, false);
  assert.deepEqual(finn(rader, '2026-11-15'), { key: '2026-11-15', siter: [], egen: false });
  assert.deepEqual(finn(rader, '2026-11-18'), { key: '2026-11-18', siter: [], egen: false, fremtid: true }); // gelecek boş kutu
  assert.equal(finn(rader, '2026-12-31').fremtid, true); // yıl aralık sonuna kadar
  assert.equal(finn(rader, '2025-12-29'), undefined); // aralık öncesi
});

test('hafta pazartesiden başlar; yıl dışı günler null', () => {
  const [r] = aarsRutenett([{ date: new Date('2026-01-01T10:00:00+01:00'), site: 'tidsrost' }], null, new Date('2026-01-04T12:00:00+01:00'));
  assert.equal(r.uker.length, 53);
  assert.equal(r.uker[0][0], null); // mandag 29. desember 2025
  assert.equal(r.uker[0][3].key, '2026-01-01');
  assert.equal(r.uker[0][4].fremtid, undefined); // 2. januar, før "i dag" 4. januar
  assert.deepEqual(r.maaneder[0], { kol: 0, mnd: '2026-01' });
  assert.equal(r.maaneder.length, 12);
});

test('boş', () => {
  assert.deepEqual(aarsRutenett([], null, NA), []);
});
