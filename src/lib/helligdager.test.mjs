import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AARSPENN, arbeidsdager, arbeidsdagerTotalt, helligdager, inneklemteDager, paaskedag } from './helligdager.mjs';

test('paaskedag: 2026 til 2030', () => {
  assert.equal(paaskedag(2026), '2026-04-05');
  assert.equal(paaskedag(2027), '2027-03-28');
  assert.equal(paaskedag(2028), '2028-04-16');
  assert.equal(paaskedag(2029), '2029-04-01');
  assert.equal(paaskedag(2030), '2030-04-21');
});

test('helligdager: tolv dager i datorekkefølge', () => {
  const h = helligdager(2026);
  assert.equal(h.length, 12);
  assert.deepEqual(h.map((x) => x.dato), [...h.map((x) => x.dato)].sort());
  assert.equal(h[0].navn, 'Nyttårsdag');
  assert.equal(h[0].ukedag, 'torsdag');
  const himmelfart = h.find((x) => x.navn === 'Kristi himmelfartsdag');
  assert.equal(himmelfart.dato, '2026-05-14');
  assert.equal(h.find((x) => x.navn === 'Skjærtorsdag').dato, '2026-04-02');
  assert.equal(h.find((x) => x.navn === 'Langfredag').dato, '2026-04-03');
  assert.equal(h.find((x) => x.navn === 'Andre påskedag').dato, '2026-04-06');
  assert.equal(h.find((x) => x.navn === 'Første pinsedag').dato, '2026-05-24');
  assert.equal(h.find((x) => x.navn === 'Andre pinsedag').dato, '2026-05-25');
  assert.equal(h.find((x) => x.navn === 'Grunnlovsdag').dato, '2026-05-17');
});

test('inneklemteDager: fredag etter Kristi himmelfartsdag 2026', () => {
  const i = inneklemteDager(2026);
  assert.ok(i.includes('2026-05-15'));
  // Hverken helligdager eller helger er inneklemt.
  assert.ok(!i.includes('2026-05-14'));
  assert.ok(!i.includes('2026-05-16'));
});

test('arbeidsdager: hverdager minus helligdager på hverdager', () => {
  for (const aar of [2026, 2027, 2028]) {
    let hverdager = 0;
    for (let d = new Date(Date.UTC(aar, 0, 1)); d.getUTCFullYear() === aar; d.setUTCDate(d.getUTCDate() + 1)) {
      const u = d.getUTCDay();
      if (u >= 1 && u <= 5) hverdager++;
    }
    // To røde dager kan falle på samme dato (2027: Grunnlovsdag og andre pinsedag); datoen trekkes fra én gang.
    const roede = new Set(
      helligdager(aar).map((h) => h.dato).filter((dato) => {
        const u = new Date(`${dato}T00:00:00Z`).getUTCDay();
        return u >= 1 && u <= 5;
      }),
    ).size;
    const m = arbeidsdager(aar);
    assert.equal(m.length, 12);
    assert.equal(arbeidsdagerTotalt(aar), hverdager - roede);
    assert.equal(m.reduce((a, b) => a + b.antall, 0), hverdager - roede);
  }
});

test('AARSPENN', () => {
  assert.equal(AARSPENN.fra, 2026);
  assert.ok(AARSPENN.til >= 2028);
});
