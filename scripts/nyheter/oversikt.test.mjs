import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { donemSec, oversiktYaz, oversiktSlug, oversiktUrl, sisteOversikt } from './oversikt.mjs';
import { oppsummeringYaz } from './dagens-oppsummering.mjs';

const md = ({ title, description = 'Ingress.', date, extra = '' }) =>
  `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\ndate: ${date}\ncategory: innenriks\n${extra}---\n\nTekst.\n`;

async function kur(saker) {
  const kok = await mkdtemp(path.join(os.tmpdir(), 'oversikt-'));
  for (const [slug, s] of Object.entries(saker)) {
    await mkdir(path.join(kok, 'src/content/haberler', slug), { recursive: true });
    await writeFile(path.join(kok, 'src/content/haberler', slug, 'index.md'), md(s));
  }
  return kok;
}
const varMi = (p) => access(p).then(() => true, () => false);
const sessiz = () => {};

const SAKER = {
  trafikk: { title: '106 omkom i trafikken i 2025 – 19 flere enn året før', description: 'Antall drepte i trafikken økte fra 87 til 106 i 2025, viser SSB.', date: '2026-11-13T08:00:00+01:00' },
  oslos: { title: 'Oslo S rammet av jordfeil og togavsporing', description: 'Togtrafikken ved Oslo S ble stanset fredag morgen etter en jordfeil.', date: '2026-11-13T08:04:52+01:00' },
  drone: { title: 'Fire døde etter droneangrep mot oljeraffineri i Volgograd', date: '2026-11-13T12:05:01+01:00' },
  kronen: { title: 'Kronen svekket seg denne uken', description: 'En euro kostet 10,57 kroner, 4 øre mer enn en uke tidligere.', date: '2026-11-13T16:11:32+01:00' },
  utkast: { title: 'Utkast', date: '2026-11-13T09:00:00+01:00', extra: 'draft: true\n' },
  fremtid: { title: 'Planlagt', date: '2026-11-14T08:00:00+01:00' },
};

test('donemSec: Oslo saatine göre (13 Kasım, CET)', () => {
  assert.equal(donemSec(new Date('2026-11-13T09:45:00Z')), 'morgen');
  assert.equal(donemSec(new Date('2026-11-13T13:45:00Z')), 'ettermiddag');
  assert.equal(donemSec(new Date('2026-11-13T17:45:00Z')), 'kveld');
});

test('oversiktSlug ve oversiktUrl', () => {
  assert.equal(oversiktSlug('2026-11-13', 'morgen'), 'oversikt-2026-11-13-morgen');
  assert.equal(oversiktUrl('2026-11-13', 'kveld'), 'https://tidsrost.com/oversikt/2026-11-13/kveld/');
});

test('oversiktYaz: son oversikt\'ten sonraki saklar, eskiden yeniye; taslak ve ileri tarihli yok; kapak çizilir', async () => {
  const kok = await kur(SAKER);
  let kapak;
  const k = await oversiktYaz({ simdi: new Date('2026-11-13T09:45:00Z'), kok, log: sessiz, kapakFn: async (a) => ((kapak = a), { png: Buffer.from('PNG') }) });
  assert.deepEqual(k.saker.map((s) => s.slug), ['trafikk', 'oslos']);
  assert.equal(k.tittel, 'Morgenoversikt');
  assert.deepEqual(kapak.basliklar, [SAKER.trafikk.title, SAKER.oslos.title]);
  assert.ok(await varMi(path.join(kok, 'public/oversikt/2026-11-13-morgen.png')));
  assert.ok(await varMi(path.join(kok, 'public/oversikt/2026-11-13-morgen-dikey.png')));
  assert.equal(kapak.bicim, 'dikey');
  const ikinci = await oversiktYaz({ simdi: new Date('2026-11-13T17:45:00Z'), kok, log: sessiz });
  assert.deepEqual(ikinci.saker.map((s) => s.slug), ['drone', 'kronen']);
  assert.equal((await sisteOversikt(kok)).donem, 'kveld');
});

test('oversiktYaz: ikiden az yeni sak varsa ya da dönem yazıldıysa null', async () => {
  const kok = await kur(SAKER);
  assert.ok(await oversiktYaz({ simdi: new Date('2026-11-13T09:45:00Z'), kok, log: sessiz }));
  assert.equal(await oversiktYaz({ simdi: new Date('2026-11-13T09:50:00Z'), kok, log: sessiz }), null);
  assert.equal(await oversiktYaz({ simdi: new Date('2026-11-13T11:30:00Z'), donem: 'ettermiddag', kok, log: sessiz }), null);
});

const GECERLI = 'Antall drepte i trafikken økte fra 87 til 106 i 2025, viser SSB. Togtrafikken ved Oslo S ble stanset fredag morgen etter en jordfeil. Kronen svekket seg denne uken, og en euro kostet 10,57 kroner.';
const AKSAM = new Date('2026-11-13T19:45:00Z');

test('oppsummeringYaz: geçerli paragraf gemini; istem bokmål; kapakta paragraftaki saklar önce', async () => {
  const kok = await kur(SAKER);
  let istem;
  let kapak;
  const r = await oppsummeringYaz({
    simdi: AKSAM, kok, log: sessiz,
    geminiFn: async (a) => ((istem = a.prompt), { paragraf: GECERLI, kimlikler: ['trafikk', 'oslos', 'kronen'] }),
    kapakFn: async (a) => ((kapak = a), { png: Buffer.from('PNG') }),
  });
  assert.deepEqual(r, { dato: '2026-11-13', yazan: 'gemini' });
  assert.match(istem, /bokmål/);
  assert.doesNotMatch(istem, /Utkast|Planlagt/);
  assert.deepEqual(kapak.basliklar.slice(0, 3), [SAKER.trafikk.title, SAKER.oslos.title, SAKER.kronen.title]);
  const kayit = JSON.parse(await readFile(path.join(kok, 'src/data/dagens/2026-11-13.json'), 'utf8'));
  assert.equal(kayit.paragraf, GECERLI);
  assert.ok(await varMi(path.join(kok, 'public/dagens/2026-11-13.png')));
  assert.ok(await varMi(path.join(kok, 'public/dagens/2026-11-13-dikey.png')));
});

test('oppsummeringYaz: uydurma ad → yedek; Gemini hatası → yedek; ikinci çalışma null', async () => {
  const kok = await kur(SAKER);
  const r = await oppsummeringYaz({ simdi: AKSAM, kok, log: sessiz, geminiFn: async () => ({ paragraf: GECERLI.replace('Oslo S', 'Bergen stasjon'), kimlikler: ['trafikk', 'oslos', 'kronen'] }) });
  assert.equal(r.yazan, 'yedek');
  assert.match(JSON.parse(await readFile(path.join(kok, 'src/data/dagens/2026-11-13.json'), 'utf8')).paragraf, /^Dagens viktigste saker: 106 omkom/);
  assert.equal(await oppsummeringYaz({ simdi: AKSAM, kok, log: sessiz, geminiFn: async () => assert.fail('çağrılmamalı') }), null);
  const kok2 = await kur(SAKER);
  assert.equal((await oppsummeringYaz({ simdi: AKSAM, kok: kok2, log: sessiz, geminiFn: async () => { throw new Error('503'); } })).yazan, 'yedek');
});

test('oppsummeringYaz: o gün sak yoksa null', async () => {
  const kok = await kur({ fremtid: SAKER.fremtid });
  assert.equal(await oppsummeringYaz({ simdi: AKSAM, kok, log: sessiz, geminiFn: async () => assert.fail('çağrılmamalı') }), null);
});
