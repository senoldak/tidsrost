import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dekrypter, fjernAdresser, hemmeligeKilder, hemmeligeMedienavn, hmacId, kildeKode, kildeSpor, krypter } from './hemmelig.mjs';
import { maskerMedier } from './tekstverktoy.mjs';
import { skrivSak } from './lib.mjs';
import medier from './kilder/medier.mjs';

const A = Buffer.alloc(32, 1);
const B = Buffer.alloc(32, 2);

test('krypter/dekrypter tur-retur; hver kryptering gir ny tekst, feil nøkkel avvises', () => {
  const v = [{ navn: 'Avis A', url: 'https://avis-a.example/sak' }];
  const s1 = krypter(v, A);
  assert.match(s1, /^v1\./);
  assert.notEqual(s1, krypter(v, A));
  assert.deepEqual(dekrypter(s1, A), v);
  assert.throws(() => dekrypter(s1, B));
  assert.ok(!s1.includes('example'));
});

test('kode og hmacId: stabile, avhenger av nøkkel, inneholder ikke navnet', () => {
  assert.equal(kildeKode('Avis A', A), kildeKode('Avis A', A));
  assert.notEqual(kildeKode('Avis A', A), kildeKode('Avis A', B));
  assert.match(kildeKode('Avis A', A), /^k[0-9a-f]{6}$/);
  assert.match(hmacId('https://avis-a.example/sak', A), /^[0-9a-f]{16}$/);
});

test('fjernAdresser fjerner adresser fra feilmeldinger', () => {
  assert.equal(fjernAdresser('404 Not Found: https://avis-a.example/rss?x=1'), '404 Not Found: [adresse]');
});

test('maskerMedier skjuler medienavn i loggtekst', () => {
  assert.equal(maskerMedier('Medier nevnt ved navn (Reuters, Klassekampen)'), 'Medier nevnt ved navn ([medie], [medie])');
  // Genitiv: navnet med s skal også fanges.
  assert.equal(maskerMedier('Nettavisens kongehusekspert og Reuters’ kilde'), '[medie] kongehusekspert og [medie]’ kilde');
  assert.equal(maskerMedier('Nettavisenes'), 'Nettavisenes');
});

test('hemmeligeKilder: leser fra fil, tom liste uten nøkkel', () => {
  const fil = path.join(mkdtempSync(path.join(tmpdir(), 'hemmelig-')), 'k.kryptert');
  const innhold = { feeder: [{ medie: 'Avis A', feed: 'https://avis-a.example/rss' }, { medie: 'Avis A', feed: 'https://avis-a.example/siste' }], medienavn: ['Avis B'] };
  writeFileSync(fil, krypter(innhold, A));
  assert.deepEqual(hemmeligeKilder({ fil, n: A }), innhold);
  assert.deepEqual(hemmeligeKilder({ fil, n: null, varsle: () => {} }), { feeder: [], medienavn: [] });
  assert.deepEqual(hemmeligeMedienavn(innhold), ['Avis A', 'Avis B']);
});

test('kildeSpor: fjerner duplikater og krypterer; tom liste gir ikke felt', () => {
  assert.equal(kildeSpor([]), undefined);
  const spor = kildeSpor([
    { navn: 'X', url: 'https://x.example/1' },
    { navn: 'X', url: 'https://x.example/1' },
  ]);
  assert.deepEqual(dekrypter(spor), [{ navn: 'X', url: 'https://x.example/1' }]);
});

test('skrivSak skriver kildeSpor i frontmatter, uten kildelinje', async () => {
  const rot = await mkdtemp(path.join(tmpdir(), 'tidsrost-'));
  const spor = kildeSpor([{ navn: 'Avis A', url: 'https://avis-a.example/sak' }]);
  const slug = await skrivSak(rot, { title: 'Testsak', description: 'Ingress.', body: 'Tekst.', date: '2026-10-15T10:00:00+02:00', category: 'innenriks', produksjon: 'ki-medier', kilder: [], kildeSpor: spor, bilde: { svg: () => null } });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  assert.ok(md.includes(`kildeSpor: "${spor}"`));
  assert.ok(!md.includes('example'));
});

test('medier: id-er er hmac, feilende feed logges uten navn og adresse', async () => {
  const gammelFetch = globalThis.fetch;
  const gammelNokkel = process.env.GEMINI_API_KEY;
  const gammelWarn = console.warn;
  const gammelLog = console.log;
  const logg = [];
  console.warn = console.log = (...a) => logg.push(a.join(' '));
  process.env.GEMINI_API_KEY = 'test';
  const naa = new Date().toUTCString();
  const rss = `<rss><channel><item><title>Brann i lager</title><link>https://avis-a.example/sak/1</link><pubDate>${naa}</pubDate><description>Ingress</description></item></channel></rss>`;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('generativelanguage')) {
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ grupper: [], kjente: [0] }) }] } }] }), { status: 200 });
    }
    if (u === 'https://avis-a.example/rss') return new Response(rss, { status: 200 });
    return new Response('nei', { status: 503, statusText: 'Service Unavailable' });
  };
  try {
    const akislar = [{ medie: 'Avis A', feed: 'https://avis-a.example/rss' }, { medie: 'Avis B', feed: 'https://avis-b.example/rss' }];
    const ut = await medier.hent({ akislar });
    assert.deepEqual(ut, []);
    assert.deepEqual(medier.alleredeSett, [`medier:${hmacId('https://avis-a.example/sak/1')}`]);
  } finally {
    globalThis.fetch = gammelFetch;
    console.warn = gammelWarn;
    console.log = gammelLog;
    if (gammelNokkel === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = gammelNokkel;
  }
  const tekst = logg.join('\n');
  assert.match(tekst, /k[0-9a-f]{6} akış okunamadı \(503 Service Unavailable: \[adresse\]\)/);
  assert.ok(!/Avis|example/.test(tekst), tekst);
});
