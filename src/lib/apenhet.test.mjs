import test from 'node:test';
import assert from 'node:assert/strict';
import { apenhetsdata, kildetype, osloDag } from './apenhet.mjs';
import { dagTittel, delPaDager, manedskalender } from './arkiv.mjs';
import { lesetid } from './ordtelling.mjs';

const NAA = new Date('2026-10-16T20:00:00Z'); // Oslo 22:00

test('kildetype: medier er ikke-offentlig, etater offentlig', () => {
  assert.equal(kildetype('medier:2741b3d97337fa13'), 'medier');
  assert.equal(kildetype('regjeringen:3176870'), 'offentlig');
  assert.equal(kildetype('ssb:abc'), 'offentlig');
});

test('osloDag: kveld UTC kan være neste dag i Oslo', () => {
  assert.equal(osloDag('2026-10-15T22:30:00Z'), '2026-10-16');
});

test('apenhetsdata: vinduet starter ved første gjennomgang, tall per dag og kildetype', () => {
  const sett = {
    'medier:a': '2026-10-15T08:00:00Z',
    'medier:b': '2026-10-15T09:00:00Z',
    'regjeringen:1': '2026-10-16T09:00:00Z',
    'ssb:2': '2026-10-16T10:00:00Z',
    'ssb:3': '2026-10-16T11:00:00Z',
  };
  const artikler = [
    { date: new Date('2026-10-15T09:30:00Z') },
    { date: new Date('2026-10-16T10:30:00Z') },
    { date: new Date('2026-09-01T12:00:00Z') },
  ];
  const v = apenhetsdata(artikler, sett, { naa: NAA });
  assert.equal(v.fra, '2026-10-15');
  assert.equal(v.antallDager, 2);
  assert.equal(v.gjennomgatt, 5);
  assert.equal(v.publisert, 2);
  assert.deepEqual(v.offentlige, { saker: 3, kilder: 2 });
  assert.deepEqual(v.medier, { saker: 2 });
  assert.deepEqual(v.daglig, [
    { dag: '2026-10-15', gjennomgatt: 2, publisert: 1 },
    { dag: '2026-10-16', gjennomgatt: 3, publisert: 1 },
  ]);
});

test('arkiv: dager nyeste først, kalender starter på mandag, norsk tittel', () => {
  const a = (iso) => ({ data: { date: new Date(iso) } });
  const d = delPaDager([a('2026-10-16T08:00:00Z'), a('2026-10-16T12:00:00Z'), a('2026-10-14T08:00:00Z')]);
  assert.deepEqual(d.map((x) => [x.dag, x.artikler.length]), [['2026-10-16', 2], ['2026-10-14', 1]]);
  const uker = manedskalender('2026-10', new Map([['2026-10-16', 2]]));
  assert.deepEqual(uker[0].slice(0, 4), [null, null, null, { dag: '2026-10-01', nr: 1, antall: 0 }]);
  assert.equal(dagTittel('2026-10-06'), '6. oktober 2026');
});

test('lesetid: 200 ord i minuttet, minst 1', () => {
  assert.equal(lesetid(''), 1);
  assert.equal(lesetid('ord '.repeat(900)), 5);
});

test('isoUke og delPaUker: årsskifte, mandag som første dag, nyeste uke først', async () => {
  const { isoUke, delPaUker } = await import('./arkiv.mjs');
  assert.equal(isoUke('2026-10-12').nokkel, '2026-42');
  assert.equal(isoUke('2026-10-11').nokkel, '2026-41');
  assert.equal(isoUke('2027-01-01').nokkel, '2026-53');
  assert.equal(isoUke('2024-12-30').nokkel, '2025-01');
  const d = (dag, n) => ({ dag, artikler: Array(n).fill({}) });
  assert.deepEqual(
    delPaUker([d('2026-10-16', 3), d('2026-10-12', 2), d('2026-10-09', 1)]).map((u) => [u.nokkel, u.forste, u.siste, u.antall]),
    [['2026-42', '2026-10-12', '2026-10-16', 5], ['2026-41', '2026-10-09', '2026-10-09', 1]],
  );
});
