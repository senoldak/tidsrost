import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTER, stegFor, faktalinje } from './redaksjon.mjs';

const seks = ['a', 'b', 'c', 'd', 'e', 'f'].map((x) => ({ navn: `Avis ${x}`, url: `https://${x}.example/` }));

test('AGENTER: alle 21 id-er med navn, rolle, utseende og ki-flagg', () => {
  const ider = ['sigrid', 'vidar', 'ingrid', 'leif', 'kari', 'tor', 'dina', 'astrid', 'bjorn', 'elin', 'fredrik', 'grete', 'henrik', 'silje', 'jonas', 'marte', 'oskar', 'liv', 'ola', 'nils', 'senol'];
  assert.deepEqual(Object.keys(AGENTER).sort(), [...ider].sort());
  for (const a of Object.values(AGENTER)) {
    assert.ok(a.navn && a.rolle && a.u?.sacRenk && a.u?.ten && typeof a.ki === 'boolean');
  }
  assert.equal(AGENTER.leif.rolle, 'Vaktsjef');
  assert.equal(AGENTER.senol.ki, false);
  assert.equal(AGENTER.sigrid.ki, true);
});

test('stegFor: antall trinn per type', () => {
  assert.equal(stegFor({ produksjon: 'ki-medier', kilder: seks, nyhetsverdi: 75 }).length, 7);
  assert.equal(stegFor({ produksjon: 'ki-kontrollert', kilder: seks.slice(0, 1) }).length, 7);
  assert.equal(stegFor({ produksjon: 'automatisk', kilder: seks.slice(0, 1) }).length, 4);
  assert.equal(stegFor({ produksjon: 'ki-automatisk', kilder: seks.slice(0, 1) }).length, 4);
  assert.equal(stegFor({ produksjon: 'ki-redigert', author: 'tidsrøst' }).length, 10);
  assert.equal(stegFor({ produksjon: 'ki-redigert', author: 'Şenol Dak', sjanger: 'forklart' }).length, 3);
  assert.equal(stegFor({ produksjon: 'manuell' }), null);
  assert.equal(stegFor({}), null);
  assert.equal(stegFor(undefined), null);
});

test('stegFor: ki-medier tekster som i eksempelet', () => {
  const s = stegFor({ produksjon: 'ki-medier', kilder: seks, nyhetsverdi: 75 });
  assert.deepEqual(s.map((x) => x.id), ['sigrid', 'vidar', 'ingrid', 'leif', 'kari', 'tor', 'dina']);
  assert.equal(s[0].tekst, 'Fant saken hos seks medier.');
  assert.equal(s[1].tekst, 'Ga den nyhetsverdi 75 av 100. Saker under 70 blir ikke skrevet.');
});

test('stegFor: ett medium og mange medier', () => {
  assert.equal(stegFor({ produksjon: 'ki-medier', kilder: seks.slice(0, 1) })[0].tekst, 'Fant saken hos ett medium.');
  const tolv = Array.from({ length: 12 }, (_, i) => ({ navn: `K${i}`, url: `https://k${i}.example/` }));
  assert.equal(stegFor({ produksjon: 'ki-medier', kilder: tolv })[0].tekst, 'Fant saken hos 12 medier.');
});

test('stegFor: Vidar uten tall når nyhetsverdi mangler', () => {
  const s = stegFor({ produksjon: 'ki-medier', kilder: seks });
  assert.equal(s[1].id, 'vidar');
  assert.equal(s[1].tekst, 'Vurderte om saken var viktig nok.');
  assert.doesNotMatch(s[1].tekst, /\d/);
});

test('stegFor: ki-kontrollert og automatisk nevner kilden', () => {
  const k = [{ navn: 'Politiet', url: 'https://politiet.example/' }];
  assert.equal(stegFor({ produksjon: 'ki-kontrollert', kilder: k })[0].tekst, 'Fant meldingen hos Politiet.');
  assert.equal(stegFor({ produksjon: 'automatisk', kilder: [{ navn: 'SSB', url: 'https://ssb.example/' }] })[0].tekst, 'Hentet tallene fra SSB.');
  assert.deepEqual(stegFor({ produksjon: 'automatisk', kilder: [] }).map((x) => x.id), ['sigrid', 'ingrid', 'kari', 'dina']);
});

test('stegFor: sjefens egen tekst går foran produksjon', () => {
  const s = stegFor({ produksjon: 'ki-redigert', author: 'Şenol Dak', sjanger: 'analyse' });
  assert.deepEqual(s.map((x) => x.id), ['senol', 'oskar', 'liv']);
  assert.equal(s[0].tekst, 'Skrev teksten og valgte tema, data og vinkling.');
});

test('stegFor: alle trinn-id-er finnes i registeret', () => {
  for (const sak of [
    { produksjon: 'ki-medier' }, { produksjon: 'ki-kontrollert' }, { produksjon: 'automatisk' },
    { produksjon: 'ki-redigert' }, { author: 'Şenol Dak', sjanger: 'forklart' },
  ]) for (const t of stegFor(sak)) assert.ok(AGENTER[t.id], t.id);
});

test('faktalinje: ki-medier, entall og manglende deler', () => {
  assert.deepEqual(faktalinje({ produksjon: 'ki-medier', kilder: seks, nyhetsverdi: 75 }), ['6 kilder', 'Nyhetsverdi 75/100', 'Ikke lest av et menneske']);
  assert.deepEqual(faktalinje({ produksjon: 'ki-medier', kilder: seks.slice(0, 1), nyhetsverdi: 80 })[0], '1 kilde');
  assert.deepEqual(faktalinje({ produksjon: 'ki-medier', kilder: seks }), ['6 kilder', 'Ikke lest av et menneske']);
  assert.deepEqual(faktalinje({ produksjon: 'ki-medier', nyhetsverdi: 72 }), ['Nyhetsverdi 72/100', 'Ikke lest av et menneske']);
  assert.deepEqual(faktalinje({ produksjon: 'ki-medier' }), ['Ikke lest av et menneske']);
  for (const d of faktalinje({ produksjon: 'ki-medier', kilder: [] })) assert.doesNotMatch(d, /undefined|NaN|\b0 kilder/);
});

test('faktalinje: ki-kontrollert, automatisk, egen tekst, manuell', () => {
  assert.deepEqual(faktalinje({ produksjon: 'ki-kontrollert', kilder: seks.slice(0, 1) }), ['1 kilde', 'Ikke lest av et menneske']);
  assert.deepEqual(faktalinje({ produksjon: 'automatisk', kilder: [{ navn: 'SSB', url: 'https://ssb.example/' }] }), ['Automatisk fra SSB', 'Ikke lest av et menneske']);
  assert.deepEqual(faktalinje({ author: 'Şenol Dak', sjanger: 'forklart', produksjon: 'ki-redigert' }), ['Skrevet av Şenol Dak', 'Oversatt og språkvasket med KI']);
  assert.deepEqual(faktalinje({ produksjon: 'manuell' }), []);
  assert.deepEqual(faktalinje({}), []);
});
