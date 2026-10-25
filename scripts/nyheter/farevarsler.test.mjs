import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { leggTilFarevarsler, slugFor, varselSidesine } from './farevarsler.mjs';

const NAA = new Date('2026-10-25T08:00:00Z');
const MET = { navn: 'Meteorologisk institutt', url: 'https://www.met.no/', lisens: 'CC BY 4.0' };
const NVE = { navn: 'NVE / Varsom', url: 'https://www.varsom.no/', lisens: 'NLOD' };
const sak = (title, kilde = MET, tekst = 'Høy vannstand ventes.') => ({
  title,
  description: `${tekst} Mer tekst.`,
  body: [`Meteorologisk institutt har sendt ut farevarsel.`, tekst, 'Følg med på oppdaterte varsler på [yr.no](https://www.yr.no/nb/farevarsler).'].join('\n\n'),
  kilde,
});
// Harita çizimi sahte: ağ ve resvg yok.
const bilde = async (s) => ({ png: Buffer.from('png'), alt: `Kart: ${s.title}`, kreditt: 'Kart: tidsrøst.' });

test('varselSidesine: gult og oransje farevarsel ja; rødt og snøskredfare nei', () => {
  assert.ok(varselSidesine({ title: 'Gult farevarsel for høy vannstand i Agder' }));
  assert.ok(varselSidesine({ title: 'Oransje farevarsel for flom i Telemark' }));
  assert.ok(!varselSidesine({ title: 'Rødt farevarsel for ekstremvær i Nordland' }));
  assert.ok(!varselSidesine({ title: 'Stor snøskredfare i Lyngen' }));
  assert.ok(!varselSidesine({ title: 'Kronen styrket seg' }));
});

test('slugFor: én side per Oslo-dato', () => {
  assert.equal(slugFor(NAA), 'farevarsler-25-oktober-2026');
  assert.equal(slugFor(new Date('2026-10-25T23:30:00Z')), 'farevarsler-26-oktober-2026');
});

test('leggTilFarevarsler: én side, oransje først, kart per varsel, «Følg med» bare én gang', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'varsel-'));
  const n = await leggTilFarevarsler(rot, [
    { id: 'met:1', sak: sak('Gult farevarsel for høy vannstand i Agder') },
    { id: 'met:2', sak: sak('Gult farevarsel for høy vannstand i Hordaland') },
  ], NAA, { bilde });
  assert.equal(n, 2);
  const senere = new Date('2026-10-25T12:00:00Z');
  assert.equal(await leggTilFarevarsler(rot, [{ id: 'nve:3', sak: sak('Oransje farevarsel for flom i Telemark', NVE, 'Mye vann i elvene.') }], senere, { bilde }), 1);

  const mappe = path.join(rot, 'src/content/haberler', 'farevarsler-25-oktober-2026');
  const md = await readFile(path.join(mappe, 'index.md'), 'utf8');
  assert.match(md, /^title: "Farevarsler 25\. oktober 2026"$/m);
  assert.match(md, /^description: "3 farevarsler fra NVE og Meteorologisk institutt 25\. oktober 2026, blant dem oransje farevarsel for flom i Telemark\."$/m);
  assert.match(md, /^breaking: true$/m);
  assert.match(md, /^cover: \.\/kart-3\.png$/m, 'kapak: en alvorlige varselets kart');
  const overskrifter = [...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(overskrifter, ['Oransje farevarsel for flom i Telemark', 'Gult farevarsel for høy vannstand i Agder', 'Gult farevarsel for høy vannstand i Hordaland']);
  assert.equal(md.match(/Følg med på oppdaterte varsler/g).length, 1);
  assert.doesNotMatch(md, /\]\(\.\/kart-3\.png\)/, 'kapakkartet gjentas ikke i teksten');
  assert.match(md, /\]\(\.\/kart-1\.png\)/);
  assert.match(md, /\*Kilder: \[NVE \/ Varsom\]\(https:\/\/www\.varsom\.no\/\) \(NLOD\), \[Meteorologisk institutt\]\(https:\/\/www\.met\.no\/\) \(CC BY 4\.0\)\*/);
  assert.deepEqual((await readdir(mappe)).sort(), ['index.md', 'kart-1.png', 'kart-2.png', 'kart-3.png', 'varsler.json']);
  // Dato er sidens første tidspunkt; oppdatert følger siste endring (sommertiden slutter 25. oktober: +01:00).
  assert.match(md, /^date: 2026-10-25T09:00/m);
  assert.match(md, /^oppdatert: 2026-10-25T13:00/m);
});

test('leggTilFarevarsler: samme varsel uendret gir ingen endring; oppdatert tekst erstatter delen', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'varsel-'));
  const a = { id: 'met:1', sak: sak('Gult farevarsel for høy vannstand i Agder') };
  assert.equal(await leggTilFarevarsler(rot, [a], NAA, { bilde }), 1);
  assert.equal(await leggTilFarevarsler(rot, [a], NAA, { bilde }), 0);
  assert.equal(await leggTilFarevarsler(rot, [{ id: 'met:1', sak: sak(a.sak.title, MET, 'Vannstanden blir høyere enn ventet.') }], NAA, { bilde }), 1);
  const md = await readFile(path.join(rot, 'src/content/haberler', slugFor(NAA), 'index.md'), 'utf8');
  assert.equal(md.match(/^## /gm).length, 1);
  assert.match(md, /høyere enn ventet/);
  assert.equal(await leggTilFarevarsler(rot, [{ id: 'met:9', sak: sak('Rødt farevarsel for ekstremvær i Nordland') }], NAA, { bilde }), 0, 'rødt går ikke på siden');
});

test('leggTilFarevarsler: én varsel gir egen ingress', async () => {
  const rot = await mkdtemp(path.join(os.tmpdir(), 'varsel-'));
  await leggTilFarevarsler(rot, [{ id: 'met:1', sak: sak('Gult farevarsel for høy vannstand i Agder') }], NAA, { bilde });
  const md = await readFile(path.join(rot, 'src/content/haberler', slugFor(NAA), 'index.md'), 'utf8');
  assert.match(md, /^description: "Gult farevarsel for høy vannstand i Agder, 25\. oktober 2026\. Høy vannstand ventes\. Mer tekst\."$/m);
  assert.doesNotMatch(md, /^breaking:/m);
  assert.match(md, /^Farevarsler fra Meteorologisk institutt i dag,/m, 'bare avsendere som har varsel på siden');
});
