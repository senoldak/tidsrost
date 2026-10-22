import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TEKST_SKJEMA } from './redaktor.mjs';
import { skrivSak } from './lib.mjs';

test('TEKST_SKJEMA inneholder why_matters og key_points', () => {
  assert.ok(TEKST_SKJEMA.properties.why_matters);
  assert.equal(TEKST_SKJEMA.properties.why_matters.type, 'string');
  assert.ok(TEKST_SKJEMA.properties.key_points);
  assert.equal(TEKST_SKJEMA.properties.key_points.type, 'array');
  assert.equal(TEKST_SKJEMA.properties.key_points.maxItems, 3);
});

test('skrivSak skriver why_matters og key_points til frontmatter', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'tidsrost-test-'));
  const sak = {
    title: 'Norges Bank holder styringsrenten uendret',
    description: 'Sentralbanken besluttet å holde renten uendret på 4,5 prosent.',
    body: 'Komiteen for pengepolitikk og finansiell stabilitet besluttet torsdag.',
    date: '2026-10-14T10:00:00+02:00',
    category: 'okonomi',
    produksjon: 'ki-tekst',
    kilde: { navn: 'Norges Bank', url: 'https://norges-bank.no' },
    why_matters: 'Styringsrenten påvirker boliglånsrenter og kronekursen direkte.',
    key_points: ['Renten holdes på 4,5 %', 'Neste rentemøte er i desember'],
  };

  const slug = await skrivSak(rot, sak);
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  assert.match(md, /why_matters: "Styringsrenten påvirker boliglånsrenter/);
  assert.match(md, /key_points:\n  - "Renten holdes på 4,5 %"\n  - "Neste rentemøte er i desember"/);
});

test('skrivSak fjerner HTML-tagger og kommentarer fra brødteksten, beholder Markdown og tekst', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'tidsrost-test-'));
  const body = [
    'Prisveksten ble <b>3 prosent</b>.<script>alert(1)</script>',
    '<a href="https://haber.example.com" onclick="x()">klikk</a> <!-- skjult -->',
    '<div class="boks">',
    'Forholdet 3 < 5 og 7 > 2; se [rapporten](https://www.norges-bank.no/).',
    '</div><br/> <!-- uavsluttet',
  ].join('\n');
  const sak = { title: 'Tagget', description: 'x', body, date: '2026-10-14T10:00:00+02:00', category: 'okonomi', produksjon: 'ki-tekst', kilde: { navn: 'Norges Bank', url: 'https://www.norges-bank.no' }, bilde: { svg: () => null } };
  const slug = await skrivSak(rot, sak);
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const tekst = md.split('---').slice(2).join('---');
  assert.doesNotMatch(tekst, /<\/?(b|a|script|div|br)\b/i);
  assert.doesNotMatch(tekst, /<!--|onclick|skjult|uavsluttet|alert/);
  assert.match(tekst, /3 prosent/);
  assert.match(tekst, /klikk/);
  assert.match(tekst, /3 < 5 og 7 > 2/);
  assert.match(tekst, /\[rapporten\]\(https:\/\/www\.norges-bank\.no\/\)/);
});
