import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { kortMelding, leggTilKortFortalt, slugFor, linje } from './kortfortalt.mjs';
import { lesHukommelse } from './dublett.mjs';

const kilde = (n) => ({ navn: 'Finansdepartementet / regjeringen.no', url: `https://www.regjeringen.no/no/aktuelt/sak-${n}/id${n}/` });
const NAA = new Date('2026-10-15T10:00:00Z');

test('kortMelding: avsenderens tittel og ingress, uten HTML; ugyldig kilde avvises', () => {
  const m = kortMelding({ tittel: 'Ny forskrift om bankgebyrer.', ingress: '<p>Regjeringen har fastsatt en ny forskrift.</p>', kilde: kilde(1) });
  assert.equal(m.tittel, 'Ny forskrift om bankgebyrer');
  assert.equal(m.ingress, 'Regjeringen har fastsatt en ny forskrift.');
  assert.equal(kortMelding({ tittel: 'X', ingress: 'Y', kilde: { navn: 'A', url: 'http://usikker.example.com' } }), null);
  assert.equal(kortMelding({ tittel: '', ingress: 'Y', kilde: kilde(1) }), null);
  assert.match(linje(m), /^- \*\*Ny forskrift om bankgebyrer\.\*\* Regjeringen har fastsatt en ny forskrift\. \*\(\[Finansdepartementet \/ regjeringen\.no\]\(https:\/\/www\.regjeringen\.no\/.+\)\)\*$/);
});

test('slugFor: én side per Oslo-dato', () => {
  assert.equal(slugFor(NAA), 'kort-fortalt-15-oktober-2026');
  // 23:30 UTC 15. oktober er 16. oktober i Oslo.
  assert.equal(slugFor(new Date('2026-10-15T23:30:00Z')), 'kort-fortalt-16-oktober-2026');
});

test('leggTilKortFortalt: lager dagens side, legger til nye linjer og hopper over samme adresse', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'kort-'));
  const a = kortMelding({ tittel: 'Sak A', ingress: 'Ingress A.', kilde: kilde(1) });
  const b = kortMelding({ tittel: 'Sak B', ingress: 'Ingress B.', kilde: kilde(2) });
  assert.equal(await leggTilKortFortalt(rot, [a], NAA), 1);
  const fil = path.join(rot, 'src/content/haberler/kort-fortalt-15-oktober-2026/index.md');
  const forste = await readFile(fil, 'utf8');
  const dato = forste.match(/^date: (\S+)/m)[1];
  assert.match(forste, /^title: "Kort fortalt 15\. oktober 2026"$/m);
  assert.match(forste, /^produksjon: automatisk$/m);

  const senere = new Date('2026-10-15T14:00:00Z');
  assert.equal(await leggTilKortFortalt(rot, [a, b, null], senere), 1);
  const andre = await readFile(fil, 'utf8');
  assert.equal(andre.match(/^date: (\S+)/m)[1], dato, 'publiseringstid beholdes');
  assert.match(andre, /^oppdatert: 2026-10-15T16:00:00\+02:00$/m);
  assert.equal(andre.split('\n').filter((l) => l.startsWith('- **')).length, 2);
  assert.ok(andre.indexOf('Sak A') < andre.indexOf('Sak B'), 'eldste linje først');

  assert.equal(await leggTilKortFortalt(rot, [a], senere), 0, 'ingen endring uten nye linjer');
  assert.equal(await leggTilKortFortalt(rot, [], senere), 0);
});

test('Kort fortalt-siden er ikke med i dublettminnet', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'kort-'));
  await leggTilKortFortalt(rot, [kortMelding({ tittel: 'Sak A', ingress: 'Ingress A.', kilde: kilde(1) })], new Date());
  const annen = path.join(rot, 'src/content/haberler/annen-sak');
  await mkdir(annen, { recursive: true });
  await writeFile(path.join(annen, 'index.md'), `---\ntitle: "Annen sak"\ndescription: "D"\ndate: ${new Date().toISOString()}\ncategory: innenriks\n---\n\nTekst.\n`);
  const minne = await lesHukommelse(rot);
  assert.deepEqual(minne.map((h) => h.slug), ['annen-sak']);
});
