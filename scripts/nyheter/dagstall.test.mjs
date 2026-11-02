import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { avvisningskoder, turTall, leggTil, osloDag, tellende, skrivDagstall, SAKLA_GUN } from './dagstall.mjs';

test('avvisningskoder: kjente begrunnelser får faste koder, standard per regel, ukjent annet', () => {
  assert.deepEqual(avvisningskoder('düşük haber değeri (42)'), ['lav-nyhetsverdi']);
  assert.deepEqual(avvisningskoder('zaten yayımlandı (en-sak)'), ['allerede-publisert']);
  assert.deepEqual(avvisningskoder('standart:kirmizi:kaynak-benzerligi,medya-adi @x#y'), ['standard:kaynak-benzerligi', 'standard:medya-adi']);
  assert.deepEqual(avvisningskoder('bare én uavhengig kilde (byråsak eller kopi)'), ['en-kilde']);
  assert.deepEqual(avvisningskoder('kontroll: tall mangler i kilden'), ['faktasjekk-stopp']);
  assert.deepEqual(avvisningskoder('krever særlig varsomhet, bør vurderes manuelt'), ['varsomhet']);
  assert.deepEqual(avvisningskoder('noe helt annet fra Kildenavn'), ['annet']);
  assert.deepEqual(avvisningskoder(undefined), ['annet']);
});

test('turTall: kildeelementer telles, skrevet og publisert er unike saker, utkast trekkes fra', () => {
  const t = turTall({
    funnet: 9,
    sonuclar: [
      { kimlik: 'a', durum: 'yazildi', slug: 's1' }, { kimlik: 'b', durum: 'yazildi', slug: 's1' },
      { kimlik: 'c', durum: 'yazildi', slug: 's2' },
      { kimlik: 'd', durum: 'elendi', gerekce: 'düşük haber değeri (30)' }, { kimlik: 'e', durum: 'elendi', gerekce: 'düşük haber değeri (50)' },
      { kimlik: 'f', durum: 'bekliyor' },
    ],
    ozet: { utkastListe: ['x'], stoppListe: [], kortLagt: 1, ventListe: ['v'] },
  });
  assert.deepEqual(t, { turer: 1, funnet: 9, vurdert: 5, avvist: { 'lav-nyhetsverdi': 2 }, skrevet: 2, utkast: 1, publisert: 1, kortfortalt: 1, venter: 1 });
});

test('leggTil: samme dag summeres (også avvist), gamle dager faller ut', () => {
  const a = turTall({ funnet: 2, sonuclar: [{ durum: 'elendi', gerekce: 'zaten yayımlandı (x)' }] });
  let d = leggTil({}, '2026-11-02', a, 't1');
  d = leggTil(d, '2026-11-02', a, 't2');
  assert.equal(d.oppdatert, 't2');
  assert.equal(d.dager['2026-11-02'].turer, 2);
  assert.equal(d.dager['2026-11-02'].funnet, 4);
  assert.deepEqual(d.dager['2026-11-02'].avvist, { 'allerede-publisert': 2 });
  const mange = { dager: Object.fromEntries(Array.from({ length: SAKLA_GUN }, (_, i) => [`2025-${String(i).padStart(4, '0')}`, { turer: 1 }])) };
  const e = leggTil(mange, '2026-11-02', a, 't3');
  assert.equal(Object.keys(e.dager).length, SAKLA_GUN);
  assert.ok(e.dager['2026-11-02'] && !e.dager['2025-0000']);
});

test('osloDag: døgnskifte etter Oslo-tid', () => {
  assert.equal(osloDag(new Date('2026-11-01T23:30:00Z')), '2026-11-02');
  assert.equal(osloDag(new Date('2026-11-01T22:30:00Z')), '2026-11-01');
});

test('tellende: teller kandidater og resultater, også delresultater fra en feil', async () => {
  const feil = Object.assign(new Error('stopp'), { sonuclar: [{ durum: 'elendi', gerekce: 'kaynakta artık yok' }] });
  const t = tellende({ adaylar: async () => [1, 2, 3], isle: async () => { throw feil; } });
  assert.equal((await t.uyarlayici.adaylar()).length, 3);
  await assert.rejects(t.uyarlayici.isle([]), /stopp/);
  assert.deepEqual(t.tall({}).avvist, { 'borte-fra-kilden': 1 });
  assert.equal(t.tall({}).funnet, 3);
});

test('skrivDagstall: lager filen og legger til; ingen fritekst i filen', async () => {
  const fil = path.join(mkdtempSync(path.join(tmpdir(), 'dagstall-')), 'redaksjonen', 'dagstall.json');
  const tall = turTall({ funnet: 1, sonuclar: [{ durum: 'elendi', gerekce: 'noe fra Kildenavn https://x.example' }] });
  await skrivDagstall(fil, tall, new Date('2026-11-02T10:00:00Z'));
  await skrivDagstall(fil, tall, new Date('2026-11-02T11:00:00Z'));
  const tekst = readFileSync(fil, 'utf8');
  assert.ok(!/Kildenavn|example/.test(tekst));
  assert.equal(JSON.parse(tekst).dager['2026-11-02'].turer, 2);
  writeFileSync(fil, '{ødelagt');
  await assert.rejects(skrivDagstall(fil, tall), SyntaxError);
});
