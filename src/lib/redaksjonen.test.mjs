import test from 'node:test';
import assert from 'node:assert/strict';
import { redaksjonsData } from './redaksjonen.mjs';

const NAA = new Date('2026-11-05T12:00:00Z');
const sak = (slug, dato, ek = {}) => ({ slug, title: `T ${slug}`, date: new Date(dato), sjanger: 'nyhet', ...ek });

test('redaksjonsData: siste dag, sju dager, avvisninger samlet; framtidige dager og saker teller ikke', () => {
  const dagstall = {
    dager: {
      '2026-10-28': { funnet: 100, vurdert: 50, publisert: 9, avvist: { 'lav-nyhetsverdi': 40 } },
      '2026-11-04': { turer: 2, funnet: 10, vurdert: 8, publisert: 3, avvist: { 'lav-nyhetsverdi': 4, 'standard:medya-adi': 1 } },
      '2026-11-05': { turer: 1, funnet: 6, vurdert: 5, publisert: 1, avvist: { 'standard:kaynak-benzerligi': 2, ukjent: 1 } },
      '2026-11-06': { funnet: 999 },
    },
  };
  const d = redaksjonsData({ saker: [], dagstall, naa: NAA });
  assert.equal(d.dag.dato, '2026-11-05');
  assert.equal(d.dag.iDag, true);
  assert.equal(d.dag.funnet, 6);
  assert.deepEqual(d.dag.avvist, { standard: 2, annet: 1 });
  assert.equal(d.uke.dager, 3);
  assert.equal(d.uke.funnet, 116);
  assert.deepEqual(d.avvisninger.map((a) => [a.kode, a.antall]), [['lav-nyhetsverdi', 44], ['standard', 3], ['annet', 1]]);
  assert.equal(d.avvisninger[0].tekst, 'For lav nyhetsverdi');
});

test('redaksjonsData: uten tall er feltene tomme, ikke null-tall', () => {
  const d = redaksjonsData({ saker: [], dagstall: undefined, naa: NAA });
  assert.equal(d.dag, null);
  assert.equal(d.uke, null);
  assert.deepEqual(d.avvisninger, []);
});

test('redaksjonsData: siste saker, siste kjedesak med runder, siste egne tekst; utkast og framtid utelatt', () => {
  const saker = [
    sak('a', '2026-11-05T08:00:00Z', { nyhetsverdi: 81 }),
    sak('utkast', '2026-11-05T09:00:00Z', { draft: true }),
    sak('framtid', '2026-11-20T08:00:00Z'),
    sak('k1', '2026-11-03T08:00:00Z', { sjanger: 'forklart', produksjon: 'ki-redigert', author: 'Şenol Dak', kjede: { runder: { yazim: 1, redaksiyon: 2, dil: 0 }, kontrollert: 117, hentet: 79 } }),
    sak('f1', '2026-11-02T08:00:00Z', { sjanger: 'forklart', author: 'Şenol Dak', produksjon: 'ki-assistert' }),
    { slug: 'u', title: 'Uten sjanger', date: new Date('2026-11-04T08:00:00Z') },
  ];
  const d = redaksjonsData({ saker, naa: NAA });
  assert.deepEqual(d.sisteSaker.map((s) => s.url), ['/artikkel/a/', '/artikkel/u/']);
  assert.equal(d.sisteSaker[0].nyhetsverdi, 81);
  assert.deepEqual(d.sisteKjede, {
    tittel: 'T k1', url: '/artikkel/k1/', tilbake: 3, kontrollert: 117, hentet: 79,
    runder: [{ steg: 'yazim', navn: 'Skribent', figur: 'skribent', antall: 1 }, { steg: 'redaksiyon', navn: 'Desk', figur: 'desk', antall: 2 }],
  });
  assert.deepEqual(d.sisteForfatter, { tittel: 'T f1', url: '/artikkel/f1/' });
});
