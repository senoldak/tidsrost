import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dilimi, bol, grupla, sec, derlemeSlug, derlemeBaslik, derlemeGovde, baslikIdleri } from './birlestir-kisa.mjs';

const h = (slug, iso, ek = {}) => ({
  slug, title: `Sak ${slug}`, description: 'Ingress.', date: new Date(iso), dateHam: iso, category: 'innenriks',
  sjanger: 'nyhet', produksjon: 'ki-kontrollert', draft: false, nyhetsverdi: 0, govde: `Tekst ${slug}.\n\n*Kilde: [SSB](https://www.ssb.no/)*`, ord: 100, ...ek,
});

test('dilimi: Oslo-tid; 00–06 hører til forrige dags kveld', () => {
  assert.deepEqual(dilimi(new Date('2026-10-12T07:00:00+02:00')), { gun: '2026-10-12', dilim: 0 });
  assert.deepEqual(dilimi(new Date('2026-10-12T12:00:00+02:00')), { gun: '2026-10-12', dilim: 1 });
  assert.deepEqual(dilimi(new Date('2026-10-12T18:30:00+02:00')), { gun: '2026-10-12', dilim: 2 });
  assert.deepEqual(dilimi(new Date('2026-10-13T02:00:00+02:00')), { gun: '2026-10-12', dilim: 2 });
});

test('bol: høyst 8 per del, jevnt fordelt', () => {
  const l = Array.from({ length: 17 }, (_, i) => h(`a${i}`, '2026-10-12T13:00:00+02:00'));
  assert.deepEqual(bol(l).map((x) => x.length), [6, 6, 5]);
  assert.deepEqual(bol(l.slice(0, 8)).map((x) => x.length), [8]);
});

test('sec: under terskelen; farevarsel, utkast, forklart og dagssider holdes utenfor', () => {
  const alle = [
    h('kort', '2026-10-12T13:00:00+02:00'),
    h('lang', '2026-10-12T13:00:00+02:00', { ord: 300 }),
    h('utkast', '2026-10-12T13:00:00+02:00', { draft: true }),
    h('forklart', '2026-10-12T13:00:00+02:00', { sjanger: 'forklart' }),
    h('kort-fortalt-12-oktober-2026', '2026-10-12T13:00:00+02:00'),
    h('gult', '2026-10-12T13:00:00+02:00', { title: 'Gult farevarsel for vind i Troms' }),
    h('rodt', '2026-10-12T13:00:00+02:00', { title: 'Rødt farevarsel for ekstremvær i Nordland' }),
    h('fremtid', '2099-01-01T08:00:00+01:00'),
  ];
  const { kisa, varsel } = sec(alle, { simdi: new Date('2026-10-26T00:00:00Z') });
  assert.deepEqual(kisa.map((x) => x.slug), ['kort']);
  assert.deepEqual(varsel.map((x) => x.slug), ['gult']);
});

test('grupla: ki-medier for seg; enslig sak går til nærmeste del av samme dag; dag uten par blir stående', () => {
  const { gruplar, kalan } = grupla([
    h('m1', '2026-10-12T08:00:00+02:00', { produksjon: 'ki-medier' }),
    h('m2', '2026-10-12T09:00:00+02:00', { produksjon: 'ki-medier' }),
    h('m3', '2026-10-12T14:00:00+02:00', { produksjon: 'ki-medier' }),
    h('r1', '2026-10-12T14:00:00+02:00'),
    h('r2', '2026-10-12T20:00:00+02:00'),
    h('ensom', '2026-10-14T20:00:00+02:00'),
  ]);
  assert.deepEqual(gruplar.map((g) => [g.akis, g.dilim, g.uyeler.map((x) => x.slug).sort()]), [
    ['medier', 0, ['m1', 'm2', 'm3']],
    ['resmi', 2, ['r1', 'r2']], // r1 (ettermiddag) var alene og går til kvelden, der r2 står
  ]);
  assert.deepEqual(kalan.map((x) => x.slug), ['ensom']);
});

test('derleme: adresse, tittel og tekst uten nye opplysninger; anker følger github-slugger', () => {
  const g = { gun: '2026-10-12', dilim: 1, uyeler: [h('a', '2026-10-12T13:05:00+02:00', { nyhetsverdi: 80, title: 'Kongsberg skal levere missiler' }), h('b', '2026-10-12T14:00:00+02:00', { title: 'Sak b' })] };
  const alinan = new Set(['nyheter-12-oktober-2026-ettermiddag']);
  assert.equal(derlemeSlug(g, alinan), 'nyheter-12-oktober-2026-ettermiddag-2');
  assert.equal(derlemeBaslik(g), 'Kongsberg skal levere missiler og 1 annen sak · 12. oktober, ettermiddag');
  const md = derlemeGovde(g);
  assert.match(md, /^## Kongsberg skal levere missiler\n\n\*Publisert 12\. oktober kl\. 13\.05\*\n\nTekst a\.\n\n\*Kilde: \[SSB\]/m);
  assert.equal(baslikIdleri(md).get('Kongsberg skal levere missiler'), 'kongsberg-skal-levere-missiler');
  assert.equal(baslikIdleri('## Sak\n\n## Sak').get('Sak'), 'sak');
});
