import { test } from 'node:test';
import assert from 'node:assert/strict';
import { googleTestIderFra } from './google-test.mjs';

const kilder = (n) => Array.from({ length: n }, (_, i) => ({ navn: `Avis ${i}`, url: `https://avis-${i}.example/a` }));
const h = (id, tittel, over = {}, stedKart = false) => ({
  id, body: 'x', stedKart,
  data: { title: tittel, description: '', date: new Date('2026-10-30T10:00:00Z'), category: 'innenriks', produksjon: 'ki-medier', sjanger: 'nyhet', kilder: kilder(3), ...over },
});
const sted = { navn: 'Drammen', lat: 59.7, lon: 10.2 };

test('ki-medier med 3 kilder og stedkart åpnes; 2 kilder, samlesak og uten bidrag ikke', () => {
  const alle = [
    h('skyting-i-drammen', 'To pågrepet etter skyting i Drammen', { sted }, true),
    h('to-kilder', 'Skyting i Drammen igjen', { sted, kilder: kilder(2) }, true),
    h('nyheter-30-oktober-2026', 'Skyting i Drammen', { sted }, true),
    h('samle', 'Skyting i Drammen og 4 andre saker', { sted }, true),
    h('uten-bidrag', 'Kulturpris til forfatter', {}),
    h('annen-produksjon', 'Skyting i Drammen', { sted, produksjon: 'ki-kontrollert' }, true),
  ];
  assert.deepEqual([...googleTestIderFra(alle, {})], ['skyting-i-drammen']);
});

test('GOOGLE_TEST=0 gir tom mengde', () => {
  const alle = [h('skyting-i-drammen', 'To pågrepet etter skyting i Drammen', { sted }, true)];
  assert.equal(googleTestIderFra(alle, { GOOGLE_TEST: '0' }).size, 0);
});
