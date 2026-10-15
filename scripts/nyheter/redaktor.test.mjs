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
