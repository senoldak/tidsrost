import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kildeDeler, kildeHtml } from './kilde-lenke.mjs';

const tekst = (d) => d.map((x) => x.tekst).join('');
const lenker = (d) => d.filter((x) => x.url).map((x) => [x.tekst, x.url]);

test('SSB og tabellnummer lenkes, teksten er uendret', () => {
  const s = 'Kilde: SSB, tabell 06752. Beregning: Tidsrøst.';
  const d = kildeDeler(s);
  assert.equal(tekst(d), s);
  assert.deepEqual(lenker(d), [
    ['SSB', 'https://www.ssb.no/'],
    ['06752', 'https://www.ssb.no/statbank/table/06752'],
  ]);
});

test('flere tabeller og etater; samme etat én gang', () => {
  const d = kildeDeler('Kilde: SSB, tabell 06752 og tabell 07459; Nav, SSB.');
  assert.deepEqual(lenker(d).map((x) => x[0]), ['SSB', '06752', '07459', 'Nav']);
  assert.equal(tekst(d), 'Kilde: SSB, tabell 06752 og tabell 07459; Nav, SSB.');
});

test('tabell uten SSB og navn inne i ord lenkes ikke', () => {
  assert.deepEqual(lenker(kildeDeler('Kilde: Eurostat, tabell 12345')), []);
  assert.deepEqual(lenker(kildeDeler('Navigasjon og METODE, Nave')), []);
});

test('HTML escapes', () => {
  assert.equal(kildeHtml('Kilde: <i>NVE</i>', (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')), 'Kilde: &lt;i&gt;<a href="https://www.nve.no/">NVE</a>&lt;/i&gt;');
  assert.deepEqual(kildeDeler(''), []);
});
